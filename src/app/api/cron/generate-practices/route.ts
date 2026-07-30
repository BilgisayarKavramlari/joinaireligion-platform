/**
 * POST /api/cron/generate-practices
 *
 * Selects eligible users and creates PracticeMessage records for the current
 * scheduled period.  Intended to be called by an external cron scheduler
 * (e.g. Vercel Cron, GitHub Actions schedule, or an external cron service).
 *
 * Authentication: Bearer token in Authorization header must match CRON_SECRET.
 *
 * Generation mode (controlled by PRACTICE_GENERATION_MODE env var):
 *   placeholder (default) — deterministic template content, no AI calls
 *   openai                — GPT-generated content, falls back to placeholder
 *                           on OpenAI error or when OPENAI_API_KEY is absent
 *
 * Idempotent: re-running for the same day/week will skip already-created
 * records (@@unique[userId, cadence, scheduledDate] + skipDuplicates:true).
 *
 * PromptVersion: the prompt spec that produced each batch is upserted once
 * before the loop; the resulting ID is stored on every PracticeMessage in
 * the batch for audit trail.
 */

export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import {
  AgentRunStatus,
  DeliveryStatus,
  GenerationStatus,
  MessageCadence,
  PracticeTier,
  SubscriptionStatus,
} from "@prisma/client";
import type { Prisma } from "@prisma/client";
import {
  isEligible,
  getCadence,
  dailyScheduledDate,
  weeklyScheduledDate,
} from "@/lib/cron/eligibility";
import {
  buildUserContext,
  generatePracticeContent,
} from "@/lib/cron/practice-builder";

// ─── Prisma select for eligible users ────────────────────────────────────────

const eligibleUserSelect = {
  id: true,
  displayName: true,
  currentLevel: true,
  xpTotal: true,
  emailVerifiedAt: true,
  emailOptIn: true,
  unsubscribedAt: true,
  subscription: { select: { status: true } },
  profile: {
    select: {
      tradition: true,
      intent: true,
      bio: true,
      timezone: true,
    },
  },
  onboarding: {
    select: { questionKey: true, answer: true },
    orderBy: { createdAt: "asc" as const },
    take: 20,
  },
  journeyLevels: {
    select: { level: true, label: true },
    orderBy: { level: "desc" as const },
    take: 1,
  },
  practiceResponses: {
    select: { responseText: true, score: true },
    orderBy: { createdAt: "desc" as const },
    take: 3,
  },
  dialogues: {
    select: { userPrompt: true },
    orderBy: { createdAt: "desc" as const },
    take: 3,
  },
} satisfies Prisma.UserSelect;

type EligibleUser = Prisma.UserGetPayload<{ select: typeof eligibleUserSelect }>;

// ─── PromptVersion helper ─────────────────────────────────────────────────────

/**
 * Idempotently upserts a PromptVersion record and returns its database ID.
 * Safe to call multiple times for the same (name, version) pair.
 */
async function upsertPromptVersion(spec: {
  name: string;
  version: number;
  body: string;
}): Promise<string> {
  const pv = await db.promptVersion.upsert({
    where: { name_version: { name: spec.name, version: spec.version } },
    create: {
      name: spec.name,
      version: spec.version,
      body: spec.body,
      isActive: true,
    },
    update: {}, // never overwrite existing body once created
    select: { id: true },
  });
  return pv.id;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  // ── 1. Authenticate ──────────────────────────────────────────────────────
  const authHeader = request.headers.get("authorization");
  if (
    !env.CRON_SECRET ||
    !authHeader ||
    authHeader !== `Bearer ${env.CRON_SECRET}`
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const todayDate = dailyScheduledDate(now);
  const thisWeekDate = weeklyScheduledDate(now);
  const generationMode = env.PRACTICE_GENERATION_MODE === "openai" ? "openai" : "placeholder";

  // ── 2. Open AgentRun record ──────────────────────────────────────────────
  const agentRun = await db.agentRun.create({
    data: {
      agentName: "practice-generator",
      taskType: "GENERATE_PRACTICES",
      status: AgentRunStatus.RUNNING,
      startedAt: now,
      input: {
        triggerDate: now.toISOString(),
        dailyScheduledDate: todayDate.toISOString(),
        weeklyScheduledDate: thisWeekDate.toISOString(),
        generationMode,
      },
    },
  });

  // ── 3. Fetch all candidate users ─────────────────────────────────────────
  let candidateUsers: EligibleUser[];
  try {
    candidateUsers = await db.user.findMany({
      where: {
        emailVerifiedAt: { not: null },
        emailOptIn: true,
        unsubscribedAt: null,
      },
      select: eligibleUserSelect,
    });
  } catch (fetchError) {
    const msg = fetchError instanceof Error ? fetchError.message : String(fetchError);
    await db.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: AgentRunStatus.FAILED,
        errorMessage: `User fetch failed: ${msg}`,
        completedAt: new Date(),
        durationMs: Date.now() - now.getTime(),
        output: { eligible: 0, created: 0, skipped: 0, errors: 1 },
      },
    });
    return Response.json(
      { error: "Failed to fetch eligible users", detail: msg },
      { status: 500 }
    );
  }

  // ── 4. Build PracticeMessage records ─────────────────────────────────────
  // promptVersionId is cached per unique promptSpec encountered in this run,
  // so PromptVersion is upserted at most twice (placeholder + openai).
  const promptVersionIdCache = new Map<string, string>();

  async function resolvePromptVersionId(spec: {
    name: string;
    version: number;
    body: string;
  }): Promise<string> {
    const cacheKey = `${spec.name}@${spec.version}`;
    if (!promptVersionIdCache.has(cacheKey)) {
      promptVersionIdCache.set(cacheKey, await upsertPromptVersion(spec));
    }
    return promptVersionIdCache.get(cacheKey)!;
  }

  const messagesToCreate: Prisma.PracticeMessageCreateManyInput[] = [];
  let skippedIneligible = 0;
  let aiGeneratedCount = 0;
  let aiFallbackCount = 0;

  for (const user of candidateUsers) {
    if (!isEligible(user)) {
      skippedIneligible++;
      continue;
    }

    const cadence = getCadence(user);
    const scheduledDate = cadence === MessageCadence.DAILY ? todayDate : thisWeekDate;
    const tier =
      user.subscription?.status === SubscriptionStatus.ACTIVE
        ? PracticeTier.PAID
        : PracticeTier.FREE;

    const context = buildUserContext(user, cadence, scheduledDate);

    // generatePracticeContent is async and handles OpenAI + fallback internally
    const generated = await generatePracticeContent(context);

    const promptVersionId = await resolvePromptVersionId(generated.promptSpec);

    if (generated.usedOpenAI) {
      aiGeneratedCount++;
    } else if (generationMode === "openai") {
      aiFallbackCount++; // intended OpenAI but fell back
    }

    messagesToCreate.push({
      userId: user.id,
      cadence,
      tier,
      scheduledDate,
      subject: generated.subject,
      bodyText: generated.bodyText,
      bodyHtml: generated.bodyHtml,
      xpReward: generated.xpReward,
      promptVersionId,
      generationStatus: GenerationStatus.GENERATED,
      deliveryStatus: DeliveryStatus.QUEUED,
      agentRunId: agentRun.id,
      generatedAt: now,
    });
  }

  // ── 5. Bulk insert, skipping duplicates ───────────────────────────────────
  let createResult: Prisma.BatchPayload;
  let dbError: string | null = null;

  try {
    createResult = await db.practiceMessage.createMany({
      data: messagesToCreate,
      skipDuplicates: true,
    });
  } catch (insertError) {
    dbError = insertError instanceof Error ? insertError.message : String(insertError);
    createResult = { count: 0 };
  }

  const created = createResult.count;
  const skippedDuplicates = messagesToCreate.length - created;
  const totalSkipped = skippedIneligible + skippedDuplicates;
  const hasError = dbError !== null;

  // ── 6. Close AgentRun ─────────────────────────────────────────────────────
  await db.agentRun.update({
    where: { id: agentRun.id },
    data: {
      status: hasError ? AgentRunStatus.FAILED : AgentRunStatus.SUCCESS,
      completedAt: new Date(),
      durationMs: Date.now() - now.getTime(),
      errorMessage: dbError,
      output: {
        generationMode,
        candidates: candidateUsers.length,
        eligible: messagesToCreate.length,
        created,
        skippedDuplicates,
        skippedIneligible,
        totalSkipped,
        aiGeneratedCount,
        aiFallbackCount,
        dailyScheduledDate: todayDate.toISOString(),
        weeklyScheduledDate: thisWeekDate.toISOString(),
      },
    },
  });

  if (hasError) {
    return Response.json(
      {
        ok: false,
        error: "Bulk insert failed",
        detail: dbError,
        agentRunId: agentRun.id,
      },
      { status: 500 }
    );
  }

  return Response.json({
    ok: true,
    agentRunId: agentRun.id,
    generationMode,
    dailyScheduledDate: todayDate.toISOString(),
    weeklyScheduledDate: thisWeekDate.toISOString(),
    candidates: candidateUsers.length,
    eligible: messagesToCreate.length,
    created,
    skippedDuplicates,
    skippedIneligible,
    totalSkipped,
    aiGeneratedCount,
    aiFallbackCount,
  });
}
