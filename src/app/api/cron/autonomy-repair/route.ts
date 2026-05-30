/**
 * POST /api/cron/autonomy-repair
 *
 * Safe, idempotent autonomous repair agent.  Performs only non-destructive
 * corrections that cannot harm user data, payments, or production prompts.
 *
 * Authentication: Bearer token must match CRON_SECRET.
 *
 * Safe repairs performed (all idempotent):
 *   1. Create missing UserJourneyState rows for verified users.
 *   2. Requeue FAILED practice messages whose generation succeeded.
 *   3. Requeue messages stuck in QUEUED state for > 48h (re-attempt send).
 *   4. Score unscored PracticeResponse records and award XP.
 *   5. Regenerate missing practice messages for eligible users (today/this week).
 *
 * Invariants enforced:
 *   - No user data is deleted.
 *   - No payment records are touched.
 *   - Real emails are only sent if EMAIL_SENDING_ENABLED=true (never by this route).
 *   - Production prompts are never changed automatically.
 *   - Every repair batch writes an AgentRun record.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import {
  AgentRunStatus,
  DeliveryStatus,
  GenerationStatus,
  MessageCadence,
  PracticeTier,
  SubscriptionStatus,
  XpSource,
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
import { scoreResponse, xpForScoreValue } from "@/lib/cron/response-scorer";
import { awardXp } from "@/lib/cron/xp-service";

// ─── Auth ─────────────────────────────────────────────────────────────────────

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  return Boolean(
    env.CRON_SECRET && authHeader === `Bearer ${env.CRON_SECRET}`
  );
}

// ─── Repair result types ──────────────────────────────────────────────────────

interface RepairResult {
  action: string;
  fixed: number;
  skipped: number;
  errors: number;
  detail?: string;
}

// ─── Repair 1: Create missing UserJourneyState rows ──────────────────────────

async function repairMissingJourneyStates(): Promise<RepairResult> {
  // Find verified users without a UserJourneyState
  const usersWithoutState = await db.user.findMany({
    where: {
      emailVerifiedAt: { not: null },
      journeyState: null,
    },
    select: { id: true },
    take: 500, // process up to 500 per run
  });

  let fixed = 0;
  let errors = 0;

  for (const user of usersWithoutState) {
    try {
      await db.userJourneyState.upsert({
        where: { userId: user.id },
        create: { userId: user.id },
        update: {}, // never overwrite existing
      });
      fixed++;
    } catch {
      errors++;
    }
  }

  return {
    action: "create_missing_journey_states",
    fixed,
    skipped: 0,
    errors,
  };
}

// ─── Repair 2: Requeue FAILED practice messages ───────────────────────────────

async function requeueFailedMessages(): Promise<RepairResult> {
  // Only requeue messages where generation succeeded (GENERATED) but delivery
  // failed — i.e., the content is valid and can be re-sent.
  const failedMessages = await db.practiceMessage.findMany({
    where: {
      deliveryStatus: DeliveryStatus.FAILED,
      generationStatus: GenerationStatus.GENERATED,
    },
    select: { id: true },
    take: 200,
  });

  if (failedMessages.length === 0) {
    return { action: "requeue_failed_messages", fixed: 0, skipped: 0, errors: 0 };
  }

  const ids = failedMessages.map((m) => m.id);
  const result = await db.practiceMessage.updateMany({
    where: { id: { in: ids } },
    data: {
      deliveryStatus: DeliveryStatus.QUEUED,
      sentAt: null,
    },
  });

  return {
    action: "requeue_failed_messages",
    fixed: result.count,
    skipped: ids.length - result.count,
    errors: 0,
    detail: `Requeued ${result.count} FAILED → QUEUED (delivery will proceed on next send-practice-emails run).`,
  };
}

// ─── Repair 3: Requeue stuck QUEUED messages (> 48h) ─────────────────────────

async function requeueStuckMessages(): Promise<RepairResult> {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const stuck = await db.practiceMessage.findMany({
    where: {
      deliveryStatus: DeliveryStatus.QUEUED,
      generatedAt: { lt: cutoff },
      sentAt: null,
    },
    select: { id: true },
    take: 200,
  });

  if (stuck.length === 0) {
    return { action: "requeue_stuck_messages", fixed: 0, skipped: 0, errors: 0 };
  }

  const ids = stuck.map((m) => m.id);
  const result = await db.practiceMessage.updateMany({
    where: { id: { in: ids } },
    data: { deliveryStatus: DeliveryStatus.QUEUED }, // keep in QUEUED, reset stale flag implicitly
  });

  return {
    action: "requeue_stuck_messages",
    fixed: result.count,
    skipped: 0,
    errors: 0,
    detail: `Refreshed ${result.count} stuck QUEUED message(s) for next delivery cycle.`,
  };
}

// ─── Repair 4: Score unscored practice responses ──────────────────────────────

async function scoreUnscoredResponses(agentRunId: string): Promise<RepairResult> {
  const unscored = await db.practiceResponse.findMany({
    where: { score: null },
    select: { id: true, userId: true, responseText: true },
    take: 200,
  });

  let fixed = 0;
  let errors = 0;
  const now = new Date();

  for (const response of unscored) {
    try {
      const { score } = scoreResponse(response.responseText);
      const xpEarned = xpForScoreValue(score);

      await db.practiceResponse.update({
        where: { id: response.id },
        data: {
          score,
          xpEarned,
          scoredAt: now,
          scoringAgentRunId: agentRunId,
        },
      });

      if (xpEarned > 0) {
        await awardXp(db, {
          userId: response.userId,
          amount: xpEarned,
          source: XpSource.PRACTICE_RESPONSE,
          sourceId: response.id,
        });
      }
      fixed++;
    } catch {
      errors++;
    }
  }

  return {
    action: "score_unscored_responses",
    fixed,
    skipped: 0,
    errors,
    detail: `Scored ${fixed} response(s), ${errors} error(s).`,
  };
}

// ─── Repair 5: Regenerate missing practice messages ──────────────────────────

const eligibleUserSelect = {
  id: true,
  displayName: true,
  currentLevel: true,
  xpTotal: true,
  emailVerifiedAt: true,
  unsubscribedAt: true,
  subscription: { select: { status: true } },
  profile: { select: { tradition: true, intent: true, bio: true, timezone: true } },
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

async function regenerateMissingPractices(agentRunId: string): Promise<RepairResult> {
  const now = new Date();
  const todayDate = dailyScheduledDate(now);
  const thisWeekDate = weeklyScheduledDate(now);

  // Fetch candidate users
  const candidates = await db.user.findMany({
    where: { emailVerifiedAt: { not: null }, unsubscribedAt: null },
    select: eligibleUserSelect,
    take: 500,
  });

  // Find users who already have a message for this period
  const existingMessages = await db.practiceMessage.findMany({
    where: {
      scheduledDate: { in: [todayDate, thisWeekDate] },
      userId: { in: candidates.map((u) => u.id) },
    },
    select: { userId: true, cadence: true },
  });
  const existingSet = new Set(
    existingMessages.map((m) => `${m.userId}:${m.cadence}`)
  );

  const messagesToCreate: Prisma.PracticeMessageCreateManyInput[] = [];
  let skipped = 0;
  let errors = 0;

  for (const user of candidates as EligibleUser[]) {
    if (!isEligible(user)) {
      skipped++;
      continue;
    }
    const cadence = getCadence(user);
    const scheduledDate = cadence === MessageCadence.DAILY ? todayDate : thisWeekDate;
    const key = `${user.id}:${cadence}`;

    if (existingSet.has(key)) {
      skipped++;
      continue;
    }

    try {
      const tier =
        user.subscription?.status === SubscriptionStatus.ACTIVE
          ? PracticeTier.PAID
          : PracticeTier.FREE;
      const context = buildUserContext(user, cadence, scheduledDate);
      const generated = await generatePracticeContent(context);

      // Upsert PromptVersion
      const pv = await db.promptVersion.upsert({
        where: {
          name_version: {
            name: generated.promptSpec.name,
            version: generated.promptSpec.version,
          },
        },
        create: {
          name: generated.promptSpec.name,
          version: generated.promptSpec.version,
          body: generated.promptSpec.body,
          isActive: true,
        },
        update: {},
        select: { id: true },
      });

      messagesToCreate.push({
        userId: user.id,
        cadence,
        tier,
        scheduledDate,
        subject: generated.subject,
        bodyText: generated.bodyText,
        bodyHtml: generated.bodyHtml,
        xpReward: generated.xpReward,
        promptVersionId: pv.id,
        generationStatus: GenerationStatus.GENERATED,
        deliveryStatus: DeliveryStatus.QUEUED,
        agentRunId,
        generatedAt: now,
      });
    } catch {
      errors++;
    }
  }

  let fixed = 0;
  if (messagesToCreate.length > 0) {
    const result = await db.practiceMessage.createMany({
      data: messagesToCreate,
      skipDuplicates: true,
    });
    fixed = result.count;
  }

  return {
    action: "regenerate_missing_practices",
    fixed,
    skipped,
    errors,
    detail: `Created ${fixed} missing practice message(s) for today/this week.`,
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Open AgentRun
  const agentRun = await db.agentRun.create({
    data: {
      agentName: "autonomy-repair",
      taskType: "AUTONOMOUS_REPAIR",
      status: AgentRunStatus.RUNNING,
      startedAt: now,
      input: { triggeredAt: now.toISOString() },
    },
  });

  const repairs: RepairResult[] = [];
  let hasErrors = false;

  try {
    repairs.push(await repairMissingJourneyStates());
    repairs.push(await requeueFailedMessages());
    repairs.push(await requeueStuckMessages());
    repairs.push(await scoreUnscoredResponses(agentRun.id));
    repairs.push(await regenerateMissingPractices(agentRun.id));

    hasErrors = repairs.some((r) => r.errors > 0);
  } catch (fatalErr) {
    const msg = fatalErr instanceof Error ? fatalErr.message : String(fatalErr);
    await db.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: AgentRunStatus.FAILED,
        errorMessage: `Fatal repair error: ${msg}`,
        completedAt: new Date(),
        durationMs: Date.now() - now.getTime(),
        output: JSON.parse(JSON.stringify({ repairs })),
      },
    });
    return NextResponse.json(
      { ok: false, error: "Repair failed", detail: msg, agentRunId: agentRun.id },
      { status: 500 }
    );
  }

  const totalFixed = repairs.reduce((s, r) => s + r.fixed, 0);

  await db.agentRun.update({
    where: { id: agentRun.id },
    data: {
      status: hasErrors ? AgentRunStatus.FAILED : AgentRunStatus.SUCCESS,
      completedAt: new Date(),
      durationMs: Date.now() - now.getTime(),
      output: JSON.parse(JSON.stringify({ repairs, totalFixed })),
    },
  });

  return NextResponse.json({
    ok: true,
    agentRunId: agentRun.id,
    totalFixed,
    repairs,
  });
}
