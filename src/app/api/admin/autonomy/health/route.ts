/**
 * GET /api/admin/autonomy/health
 *
 * Self-auditing system health check.  Returns a structured JSON report
 * describing the operational state of every autonomous subsystem.
 *
 * Authentication: Bearer token must match CRON_SECRET  OR  the caller must be
 * an authenticated admin session (jair_session cookie with role ADMIN).
 *
 * Response shape:
 *   {
 *     status: "OK" | "WARNING" | "CRITICAL",
 *     checkedAt: ISO string,
 *     findings: Finding[],
 *     recommendedActions: string[],
 *     safeAutoFixActions: string[],
 *     requiresHumanApproval: string[],
 *   }
 *
 * Finding:
 *   { key: string, level: "ok"|"warning"|"critical", message: string, value?: unknown }
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getSessionFromCookie } from "@/lib/auth";
import {
  AgentRunStatus,
  DeliveryStatus,
  GenerationStatus,
} from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type FindingLevel = "ok" | "warning" | "critical";

interface Finding {
  key: string;
  level: FindingLevel;
  message: string;
  value?: unknown;
}

interface HealthReport {
  status: "OK" | "WARNING" | "CRITICAL";
  checkedAt: string;
  findings: Finding[];
  recommendedActions: string[];
  safeAutoFixActions: string[];
  requiresHumanApproval: string[];
}

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function isAuthorized(request: NextRequest): Promise<boolean> {
  // Option 1: Bearer CRON_SECRET
  const authHeader = request.headers.get("authorization");
  if (env.CRON_SECRET && authHeader === `Bearer ${env.CRON_SECRET}`) {
    return true;
  }
  // Option 2: Admin session cookie
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("jair_session")?.value);
  if (session?.role === "ADMIN") return true;
  return false;
}

// ─── Check helpers ────────────────────────────────────────────────────────────

const HOURS_24 = 24 * 60 * 60 * 1000;
const HOURS_48 = 48 * 60 * 60 * 1000;

function ago(ms: number): Date {
  return new Date(Date.now() - ms);
}

async function checkDatabase(findings: Finding[]): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`;
    findings.push({ key: "db_connectivity", level: "ok", message: "Database connection is healthy." });
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    findings.push({
      key: "db_connectivity",
      level: "critical",
      message: `Database connection failed: ${msg}`,
    });
    return false;
  }
}

async function checkAgentRuns(findings: Finding[]): Promise<void> {
  const since24h = ago(HOURS_24);

  // practice generation
  const lastGen = await db.agentRun.findFirst({
    where: { agentName: "practice-generator" },
    orderBy: { startedAt: "desc" },
    select: { status: true, startedAt: true, completedAt: true, output: true },
  });
  if (!lastGen) {
    findings.push({
      key: "agent_generate_last_run",
      level: "warning",
      message: "Practice generator has never run.",
    });
  } else if (lastGen.status === AgentRunStatus.FAILED) {
    findings.push({
      key: "agent_generate_last_run",
      level: "critical",
      message: `Practice generator last run FAILED at ${lastGen.startedAt.toISOString()}.`,
      value: lastGen.output,
    });
  } else if (lastGen.startedAt < since24h) {
    findings.push({
      key: "agent_generate_last_run",
      level: "warning",
      message: `Practice generator has not run in the last 24h (last: ${lastGen.startedAt.toISOString()}).`,
    });
  } else {
    findings.push({
      key: "agent_generate_last_run",
      level: "ok",
      message: `Practice generator last ran at ${lastGen.startedAt.toISOString()}.`,
    });
  }

  // email delivery
  const lastEmail = await db.agentRun.findFirst({
    where: { agentName: "email-delivery" },
    orderBy: { startedAt: "desc" },
    select: { status: true, startedAt: true, output: true },
  });
  if (!lastEmail) {
    findings.push({
      key: "agent_email_last_run",
      level: "warning",
      message: "Email delivery agent has never run.",
    });
  } else if (lastEmail.status === AgentRunStatus.FAILED) {
    findings.push({
      key: "agent_email_last_run",
      level: "critical",
      message: `Email delivery last run FAILED at ${lastEmail.startedAt.toISOString()}.`,
      value: lastEmail.output,
    });
  } else if (lastEmail.startedAt < since24h) {
    findings.push({
      key: "agent_email_last_run",
      level: "warning",
      message: `Email delivery has not run in the last 24h (last: ${lastEmail.startedAt.toISOString()}).`,
    });
  } else {
    findings.push({
      key: "agent_email_last_run",
      level: "ok",
      message: `Email delivery last ran at ${lastEmail.startedAt.toISOString()}.`,
    });
  }

  // scoring
  const lastScore = await db.agentRun.findFirst({
    where: { agentName: "response-scorer" },
    orderBy: { startedAt: "desc" },
    select: { status: true, startedAt: true, output: true },
  });
  if (!lastScore) {
    findings.push({
      key: "agent_scoring_last_run",
      level: "warning",
      message: "Response scorer has never run.",
    });
  } else if (lastScore.status === AgentRunStatus.FAILED) {
    findings.push({
      key: "agent_scoring_last_run",
      level: "critical",
      message: `Response scorer last run FAILED at ${lastScore.startedAt.toISOString()}.`,
      value: lastScore.output,
    });
  } else if (lastScore.startedAt < since24h) {
    findings.push({
      key: "agent_scoring_last_run",
      level: "warning",
      message: `Response scorer has not run in the last 24h (last: ${lastScore.startedAt.toISOString()}).`,
    });
  } else {
    findings.push({
      key: "agent_scoring_last_run",
      level: "ok",
      message: `Response scorer last ran at ${lastScore.startedAt.toISOString()}.`,
    });
  }
}

async function checkQueues(findings: Finding[]): Promise<void> {
  const queued = await db.practiceMessage.count({
    where: { deliveryStatus: DeliveryStatus.QUEUED },
  });
  findings.push({
    key: "queue_messages_queued",
    level: queued > 500 ? "warning" : "ok",
    message: `${queued} practice message(s) queued for delivery.`,
    value: queued,
  });

  const failed = await db.practiceMessage.count({
    where: { deliveryStatus: DeliveryStatus.FAILED },
  });
  findings.push({
    key: "queue_messages_failed",
    level: failed > 0 ? (failed > 20 ? "critical" : "warning") : "ok",
    message: `${failed} practice message(s) in FAILED state.`,
    value: failed,
  });

  // Messages stuck in QUEUED for > 48h — potential send failures
  const stuckCount = await db.practiceMessage.count({
    where: {
      deliveryStatus: DeliveryStatus.QUEUED,
      generatedAt: { lt: ago(HOURS_48) },
    },
  });
  findings.push({
    key: "queue_messages_stuck",
    level: stuckCount > 0 ? "warning" : "ok",
    message:
      stuckCount > 0
        ? `${stuckCount} message(s) have been QUEUED for over 48h without being sent.`
        : "No messages stuck in queue.",
    value: stuckCount,
  });

  const unscored = await db.practiceResponse.count({
    where: { score: null },
  });
  findings.push({
    key: "queue_unscored_responses",
    level: unscored > 50 ? "warning" : "ok",
    message: `${unscored} practice response(s) not yet scored.`,
    value: unscored,
  });
}

async function checkXpIntegrity(findings: Finding[]): Promise<void> {
  // Detect potential duplicate XP entries (same source+sourceId appearing twice).
  //
  // Prisma preserves model/field casing in PostgreSQL (no @@map), so the table
  // is "XpLedger" and columns are camelCase ("sourceId").  This raw query must
  // use double-quoted identifiers; snake_case names will produce 42P01 errors.
  //
  // The entire check is wrapped in try/catch: a schema mismatch should produce
  // a WARNING finding, not a 500 on the health endpoint.
  try {
    const dupResult = await db.$queryRaw<{ n: bigint }[]>`
      SELECT COUNT(*) AS n
      FROM (
        SELECT "source", "sourceId"
        FROM "XpLedger"
        GROUP BY "source", "sourceId"
        HAVING COUNT(*) > 1
      ) dups
    `;
    const dupCount = Number(dupResult[0]?.n ?? 0);
    findings.push({
      key: "xp_duplicate_risk",
      level: dupCount > 0 ? "critical" : "ok",
      message:
        dupCount > 0
          ? `${dupCount} XP ledger (source, sourceId) pair(s) have duplicate entries — idempotency violation.`
          : "XP ledger: no duplicate source entries detected.",
      value: dupCount,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    findings.push({
      key: "xp_duplicate_risk",
      level: "warning",
      message: `XP ledger integrity check failed (schema query error): ${msg.slice(0, 200)}`,
      value: null,
    });
  }
}

async function checkUserData(findings: Finding[]): Promise<void> {
  // Users without UserJourneyState
  const totalUsers = await db.user.count({
    where: { emailVerifiedAt: { not: null } },
  });
  const usersWithState = await db.userJourneyState.count();
  const missingState = totalUsers - usersWithState;
  findings.push({
    key: "users_missing_journey_state",
    level: missingState > 0 ? "warning" : "ok",
    message:
      missingState > 0
        ? `${missingState} verified user(s) have no UserJourneyState record.`
        : "All verified users have a UserJourneyState record.",
    value: missingState,
  });

  // Users who completed registration but have no onboarding answers
  const usersWithOnboarding = await db.onboardingAnswer.groupBy({
    by: ["userId"],
    _count: { userId: true },
  });
  const onboardedSet = new Set(usersWithOnboarding.map((r) => r.userId));
  const noOnboarding = totalUsers - onboardedSet.size;
  findings.push({
    key: "users_missing_onboarding",
    level: noOnboarding > 0 ? "warning" : "ok",
    message:
      noOnboarding > 0
        ? `${noOnboarding} verified user(s) have no onboarding answers (practice context will be generic).`
        : "All verified users have at least one onboarding answer.",
    value: noOnboarding,
  });
}

function checkConfig(findings: Finding[]): void {
  // Email sending mode
  const emailEnabled = env.EMAIL_SENDING_ENABLED === "true";
  findings.push({
    key: "config_email_sending",
    level: "ok",
    message: emailEnabled
      ? "EMAIL_SENDING_ENABLED=true — live email delivery is active."
      : "EMAIL_SENDING_ENABLED is not 'true' — emails will be logged but not sent.",
    value: env.EMAIL_SENDING_ENABLED ?? "unset",
  });

  // OpenAI generation mode
  const genMode = env.PRACTICE_GENERATION_MODE ?? "placeholder";
  const openaiKey = Boolean(env.OPENAI_API_KEY);
  if (genMode === "openai" && !openaiKey) {
    findings.push({
      key: "config_openai_mode",
      level: "warning",
      message:
        "PRACTICE_GENERATION_MODE=openai but OPENAI_API_KEY is not set — will fall back to placeholder.",
      value: genMode,
    });
  } else {
    findings.push({
      key: "config_openai_mode",
      level: "ok",
      message: `Practice generation mode: ${genMode}${genMode === "openai" ? " (API key present)" : ""}.`,
      value: genMode,
    });
  }
}

// ─── Build recommendations ────────────────────────────────────────────────────

function buildRecommendations(findings: Finding[]): {
  recommendedActions: string[];
  safeAutoFixActions: string[];
  requiresHumanApproval: string[];
} {
  const recommendedActions: string[] = [];
  const safeAutoFixActions: string[] = [];
  const requiresHumanApproval: string[] = [];

  for (const f of findings) {
    if (f.level === "ok") continue;

    switch (f.key) {
      case "db_connectivity":
        requiresHumanApproval.push("Restore database connectivity — check DATABASE_URL and server status.");
        break;
      case "agent_generate_last_run":
        recommendedActions.push("Trigger POST /api/cron/generate-practices to regenerate today's practices.");
        safeAutoFixActions.push("autonomy-repair: regenerate missing practice messages for eligible users");
        break;
      case "agent_email_last_run":
        recommendedActions.push("Trigger POST /api/cron/send-practice-emails?mode=LIVE to send queued messages.");
        safeAutoFixActions.push("autonomy-repair: retry sending queued practice messages");
        break;
      case "agent_scoring_last_run":
        recommendedActions.push("Trigger POST /api/cron/score-practice-responses to score pending responses.");
        safeAutoFixActions.push("autonomy-repair: score all unscored practice responses");
        break;
      case "queue_messages_failed":
        recommendedActions.push(`Investigate ${f.value} failed PracticeMessage records — check EmailLog for errors.`);
        safeAutoFixActions.push("autonomy-repair: requeue FAILED messages as QUEUED if generation was successful");
        break;
      case "queue_messages_stuck":
        safeAutoFixActions.push("autonomy-repair: requeue stuck QUEUED messages (older than 48h)");
        break;
      case "queue_unscored_responses":
        safeAutoFixActions.push("autonomy-repair: score all unscored practice responses");
        break;
      case "xp_duplicate_risk":
        if (f.level === "critical") {
          requiresHumanApproval.push(
            "XP duplicate entries detected — manual audit required before any automated cleanup."
          );
        } else {
          recommendedActions.push(
            "XP ledger integrity check returned a query error — verify database schema is fully migrated (run: npx prisma db push)."
          );
        }
        break;
      case "users_missing_journey_state":
        safeAutoFixActions.push("autonomy-repair: create missing UserJourneyState rows for verified users");
        break;
      case "users_missing_onboarding":
        recommendedActions.push(
          "Prompt users without onboarding answers to complete the onboarding flow at /onboarding."
        );
        break;
      case "config_openai_mode":
        requiresHumanApproval.push("Set OPENAI_API_KEY in the production environment to enable AI-generated practices.");
        break;
    }
  }

  return { recommendedActions, safeAutoFixActions, requiresHumanApproval };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const findings: Finding[] = [];
  const checkedAt = new Date().toISOString();

  // Run all checks — DB connectivity first; skip DB checks if it fails
  const dbOk = await checkDatabase(findings);
  if (dbOk) {
    await Promise.all([
      checkAgentRuns(findings),
      checkQueues(findings),
      checkXpIntegrity(findings),
      checkUserData(findings),
    ]);
  }
  checkConfig(findings);

  // Derive overall status
  const hasCritical = findings.some((f) => f.level === "critical");
  const hasWarning = findings.some((f) => f.level === "warning");
  const status: HealthReport["status"] = hasCritical
    ? "CRITICAL"
    : hasWarning
    ? "WARNING"
    : "OK";

  const { recommendedActions, safeAutoFixActions, requiresHumanApproval } =
    buildRecommendations(findings);

  const report: HealthReport = {
    status,
    checkedAt,
    findings,
    recommendedActions: [...new Set(recommendedActions)],
    safeAutoFixActions: [...new Set(safeAutoFixActions)],
    requiresHumanApproval: [...new Set(requiresHumanApproval)],
  };

  return NextResponse.json(report, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
