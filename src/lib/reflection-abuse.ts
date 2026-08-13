import crypto from "node:crypto";
import { ActivityEventType, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import type { MembershipEntitlements } from "@/lib/membership";
import type { ReflectionMode } from "@/lib/reflection-companion";

const RESERVATION_EVENT = "reflection_request_reserved";
const SESSION_EVENT = "reflection_session_started";

function positiveInteger(value: string | undefined, fallback: number, maximum = 100_000): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

export function reflectionAbuseLimits(initiate: boolean) {
  return {
    globalDaily: positiveInteger(env.AI_REFLECTION_GLOBAL_DAILY_LIMIT, 1_000),
    ipDaily: initiate
      ? positiveInteger(env.AI_REFLECTION_INITIATE_IP_DAILY_LIMIT, 72, 10_000)
      : positiveInteger(env.AI_REFLECTION_FREE_IP_DAILY_LIMIT, 24, 10_000),
  };
}

export function utcDayWindow(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return { start, end: new Date(start.getTime() + 86_400_000) };
}

export function hashReflectionIp(ip: string, secret: string, now = new Date()): string {
  return crypto.createHmac("sha256", secret).update(`reflection-ip|${utcDayWindow(now).start.toISOString()}|${ip}`).digest("hex");
}

export function reflectionSessionPath(conversationId: string): string {
  return `/companion/session/${conversationId}`;
}

export type ReflectionReservation = {
  allowed: true;
  used: number;
  limit: number;
  turn: number;
  turnLimit: number;
  sessionsUsed: number;
  sessionLimit: number;
} | {
  allowed: false;
  code: "daily_quota" | "session_limit" | "turn_limit" | "ip_budget" | "global_budget";
  retryAfter: number;
};

export async function reserveReflectionUsage(input: {
  userId: string;
  ipHash: string;
  conversationId: string;
  mode: ReflectionMode;
  entitlements: MembershipEntitlements;
  now?: Date;
}): Promise<ReflectionReservation> {
  const now = input.now || new Date();
  const day = utcDayWindow(now);
  const initiate = input.entitlements.plan === "initiate" && input.entitlements.subscriptionActive;
  const limits = reflectionAbuseLimits(initiate);
  const sessionPath = reflectionSessionPath(input.conversationId);
  const retryAfter = Math.max(1, Math.ceil((day.end.getTime() - now.getTime()) / 1_000));

  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`reflection-budget:${day.start.toISOString()}`}))`;

    const globalUsed = await tx.userActivityLog.count({
      where: { eventName: RESERVATION_EVENT, createdAt: { gte: day.start, lt: day.end } },
    });
    if (globalUsed >= limits.globalDaily) return { allowed: false, code: "global_budget", retryAfter } as const;

    const ipUsed = await tx.userActivityLog.count({
      where: { eventName: RESERVATION_EVENT, ipHash: input.ipHash, createdAt: { gte: day.start, lt: day.end } },
    });
    if (ipUsed >= limits.ipDaily) return { allowed: false, code: "ip_budget", retryAfter } as const;

    const existingSession = await tx.userActivityLog.findFirst({
      where: { userId: input.userId, eventName: SESSION_EVENT, path: sessionPath, createdAt: { gte: day.start, lt: day.end } },
      select: { id: true },
    });
    const sessionsUsed = await tx.userActivityLog.count({
      where: { userId: input.userId, eventName: SESSION_EVENT, createdAt: { gte: day.start, lt: day.end } },
    });
    if (!existingSession && sessionsUsed >= input.entitlements.reflectionDailySessions) {
      return { allowed: false, code: "session_limit", retryAfter } as const;
    }

    const turnsUsed = await tx.userActivityLog.count({
      where: { userId: input.userId, eventName: RESERVATION_EVENT, path: sessionPath, createdAt: { gte: day.start, lt: day.end } },
    });
    if (turnsUsed >= input.entitlements.reflectionTurnsPerSession) {
      return { allowed: false, code: "turn_limit", retryAfter } as const;
    }

    let quota = await tx.queryQuota.findUnique({ where: { userId: input.userId } });
    if (!quota || quota.periodStart < day.start || quota.periodEnd <= now) {
      quota = await tx.queryQuota.upsert({
        where: { userId: input.userId },
        create: {
          userId: input.userId,
          periodStart: day.start,
          periodEnd: day.end,
          usedQueries: 0,
          maxQueries: input.entitlements.aiDailyLimit,
        },
        update: {
          periodStart: day.start,
          periodEnd: day.end,
          usedQueries: 0,
          maxQueries: input.entitlements.aiDailyLimit,
          lastResetAt: now,
        },
      });
    }

    const quotaUpdate = await tx.queryQuota.updateMany({
      where: { id: quota.id, usedQueries: { lt: input.entitlements.aiDailyLimit } },
      data: { usedQueries: { increment: 1 }, maxQueries: input.entitlements.aiDailyLimit },
    });
    if (quotaUpdate.count !== 1) return { allowed: false, code: "daily_quota", retryAfter } as const;

    if (!existingSession) {
      await tx.userActivityLog.create({
        data: {
          userId: input.userId,
          eventType: ActivityEventType.AI,
          eventName: SESSION_EVENT,
          path: sessionPath,
          method: "POST",
          metadata: {
            mode: input.mode,
            plan: initiate ? "initiate" : "standard",
            privacy: "no_conversation_text",
          },
        },
      });
    }

    await tx.userActivityLog.create({
      data: {
        userId: input.userId,
        eventType: ActivityEventType.AI,
        eventName: RESERVATION_EVENT,
        path: sessionPath,
        method: "POST",
        ipHash: input.ipHash,
        userAgent: null,
        metadata: {
          mode: input.mode,
          plan: initiate ? "initiate" : "standard",
          turn: turnsUsed + 1,
          outputTokenCeiling: initiate ? 1_400 : 900,
          privacy: "daily_hmac_ip_no_conversation_text",
        },
      },
    });

    return {
      allowed: true,
      used: quota.usedQueries + 1,
      limit: input.entitlements.aiDailyLimit,
      turn: turnsUsed + 1,
      turnLimit: input.entitlements.reflectionTurnsPerSession,
      sessionsUsed: sessionsUsed + (existingSession ? 0 : 1),
      sessionLimit: input.entitlements.reflectionDailySessions,
    } as const;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
}

export async function reflectionQuotaStatus(input: {
  userId: string;
  entitlements: MembershipEntitlements;
  now?: Date;
}) {
  const now = input.now || new Date();
  const day = utcDayWindow(now);
  const [quota, sessionsUsed] = await Promise.all([
    db.queryQuota.findUnique({ where: { userId: input.userId } }),
    db.userActivityLog.count({
      where: { userId: input.userId, eventName: SESSION_EVENT, createdAt: { gte: day.start, lt: day.end } },
    }),
  ]);
  const used = quota && quota.periodStart >= day.start && quota.periodEnd > now ? quota.usedQueries : 0;
  return {
    used,
    limit: input.entitlements.aiDailyLimit,
    remaining: Math.max(0, input.entitlements.aiDailyLimit - used),
    sessionsUsed,
    sessionLimit: input.entitlements.reflectionDailySessions,
    turnsPerSession: input.entitlements.reflectionTurnsPerSession,
    lifeMode: input.entitlements.reflectionLifeMode,
    resetsAt: day.end.toISOString(),
  };
}

export async function recordReflectionOutcome(input: {
  userId: string;
  conversationId: string;
  mode: ReflectionMode;
  promptCharCount: number;
  model: string | null;
  tokensInput: number | null;
  tokensOutput: number | null;
  totalTokens: number | null;
  latencyMs: number;
  outcome: "completed" | "input_blocked" | "output_blocked" | "provider_failed" | "crisis_redirect";
  safetyFlags: string[];
  providerFailureCode?: string;
  unlinkUser?: boolean;
}) {
  const path = input.unlinkUser ? "/companion" : reflectionSessionPath(input.conversationId);
  const activity = db.userActivityLog.create({
    data: {
      userId: input.unlinkUser ? null : input.userId,
      eventType: ActivityEventType.AI,
      eventName: "reflection_response_completed",
      path,
      method: "POST",
      metadata: {
        mode: input.mode,
        outcome: input.outcome,
        tokensInput: input.tokensInput,
        tokensOutput: input.tokensOutput,
        totalTokens: input.totalTokens,
        latencyMs: input.latencyMs,
        safetyFlagCount: input.safetyFlags.length,
        privacy: input.unlinkUser ? "unlinked_no_conversation_text" : "no_conversation_text",
      },
    },
  });
  if (input.unlinkUser) {
    await activity;
    return;
  }
  const providerFailureCode = input.outcome === "provider_failed"
    ? String(input.providerFailureCode || "provider_unknown").replace(/[^a-z0-9_+.-]/g, "").slice(0, 160)
    : undefined;
  await db.$transaction([
    db.aiDialogue.create({
      data: {
        userId: input.userId,
        conversationId: input.conversationId,
        userPrompt: "[not retained]",
        assistantResponse: null,
        promptCharCount: input.promptCharCount,
        model: input.model,
        tokensInput: input.tokensInput,
        tokensOutput: input.tokensOutput,
        totalTokens: input.totalTokens,
        latencyMs: input.latencyMs,
        safetyFlags: {
          outcome: input.outcome,
          flagCount: input.safetyFlags.length,
          containsConversationText: false,
          ...(providerFailureCode ? { providerFailureCode } : {}),
        },
        checklistSnapshot: {
          version: "reflection-safety-v1",
          deterministicInputGate: true,
          providerModerationRequiredForGeneratedAnswers: true,
          deterministicOutputGate: true,
          structuredOutput: true,
          toolsEnabled: false,
          providerApplicationStateStored: false,
          providerAbuseMonitoringMayRetainUpToDays: 30,
          conversationTextRetained: false,
        },
      },
    }),
    activity,
  ]);
}

export async function recordReflectionFeedback(input: {
  userId: string;
  conversationId: string;
  useful: boolean;
}) {
  const path = reflectionSessionPath(input.conversationId);
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`reflection-feedback:${input.userId}:${input.conversationId}`}))`;
    const existing = await tx.userActivityLog.findFirst({
      where: { userId: input.userId, eventName: "reflection_feedback", path },
      select: { id: true },
    });
    if (existing) {
      return tx.userActivityLog.update({
        where: { id: existing.id },
        data: { metadata: { useful: input.useful, privacy: "no_conversation_text" } },
        select: { id: true },
      });
    }
    return tx.userActivityLog.create({
      data: {
        userId: input.userId,
        eventType: ActivityEventType.USER,
        eventName: "reflection_feedback",
        path,
        method: "POST",
        metadata: { useful: input.useful, privacy: "no_conversation_text" },
      },
      select: { id: true },
    });
  });
}
