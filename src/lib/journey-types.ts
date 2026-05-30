/**
 * journey-types.ts
 *
 * Type-safe helpers for the Personalized Journey Automation System.
 * All types are derived directly from the Prisma schema — no hand-written
 * interfaces that could drift from the database.
 *
 * DO NOT add business logic that touches the database here.
 * This file is import-safe (no side effects, no DB calls).
 */

import type { Prisma } from "@prisma/client";
import {
  MessageCadence,
  PracticeTier,
  GenerationStatus,
  DeliveryStatus,
  AgentRunStatus,
  XpSource,
} from "@prisma/client";

// ─── Re-export enums for convenience ─────────────────────────────────────────

export {
  MessageCadence,
  PracticeTier,
  GenerationStatus,
  DeliveryStatus,
  AgentRunStatus,
  XpSource,
};

// ─── Prisma model payload types ───────────────────────────────────────────────

/** Full UserJourneyState row. */
export type JourneyState = Prisma.UserJourneyStateGetPayload<Record<string, never>>;

/** Full PromptVersion row. */
export type PromptVersionRow = Prisma.PromptVersionGetPayload<Record<string, never>>;

/** Full AgentRun row. */
export type AgentRunRow = Prisma.AgentRunGetPayload<Record<string, never>>;

/** Full PracticeMessage row. */
export type PracticeMessageRow = Prisma.PracticeMessageGetPayload<Record<string, never>>;

/** Full PracticeResponse row. */
export type PracticeResponseRow = Prisma.PracticeResponseGetPayload<Record<string, never>>;

/** Full XpLedger row. */
export type XpLedgerRow = Prisma.XpLedgerGetPayload<Record<string, never>>;

/** PracticeMessage with its responses included. */
export type PracticeMessageWithResponses = Prisma.PracticeMessageGetPayload<{
  include: { responses: true };
}>;

/** PracticeResponse with its parent message included. */
export type PracticeResponseWithMessage = Prisma.PracticeResponseGetPayload<{
  include: { practiceMessage: true };
}>;

/** XpLedger row with the owning user's email. */
export type XpLedgerWithUser = Prisma.XpLedgerGetPayload<{
  include: { user: { select: { email: true; displayName: true } } };
}>;

// ─── Input types for creating records ────────────────────────────────────────

/** Minimal fields required to schedule a new PracticeMessage. */
export type CreatePracticeMessageInput = Pick<
  Prisma.PracticeMessageCreateInput,
  "cadence" | "tier" | "scheduledDate" | "xpReward"
> & {
  userId: string;
  promptVersionId?: string;
  agentRunId?: string;
};

/** Minimal fields required to record a user's practice response. */
export type CreatePracticeResponseInput = {
  userId: string;
  practiceMessageId: string;
  responseText: string;
};

/** Fields written by the scoring agent when it evaluates a response. */
export type ScorePracticeResponseInput = {
  score: number;          // 0–5
  feedback?: string;
  xpEarned: number;
  scoringAgentRunId?: string;
};

/** Fields for opening a new AgentRun. */
export type CreateAgentRunInput = {
  agentName: string;
  taskType: string;
  userId?: string;
  input?: Record<string, unknown>;
};

/** Fields for closing an AgentRun on success. */
export type CompleteAgentRunInput = {
  output?: Record<string, unknown>;
  durationMs?: number;
};

/** Fields for marking an AgentRun as failed. */
export type FailAgentRunInput = {
  errorMessage: string;
  durationMs?: number;
};

/** Payload for recording an XP delta in the ledger. */
export type RecordXpInput = {
  userId: string;
  amount: number;
  source: XpSource;
  sourceId?: string;
  balanceBefore: number;
  notes?: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

/** Number of XP points awarded per practice response score level. */
export const XP_PER_SCORE: Readonly<Record<number, number>> = {
  0: 0,
  1: 5,
  2: 10,
  3: 20,
  4: 35,
  5: 50,
} as const;

/** Minimum XP total required to reach each level (1-indexed). */
export const LEVEL_XP_THRESHOLDS: Readonly<number[]> = [
  0,    // level 1  — starting level
  100,  // level 2
  250,  // level 3
  500,  // level 4
  900,  // level 5
  1400, // level 6
  2100, // level 7
  3000, // level 8
  4200, // level 9
  5800, // level 10
] as const;

/** How many days without a response before a streak resets. */
export const STREAK_GRACE_DAYS = 1;

/** Maximum score value for a practice response. */
export const MAX_PRACTICE_SCORE = 5;

// ─── Pure utility functions ───────────────────────────────────────────────────

/**
 * Calculate the XP earned for a given score (0–5).
 * Returns 0 for out-of-range scores rather than throwing.
 */
export function xpForScore(score: number): number {
  return XP_PER_SCORE[Math.max(0, Math.min(MAX_PRACTICE_SCORE, Math.round(score)))] ?? 0;
}

/**
 * Given a total XP value, return the level the user should be at.
 * Level is 1-indexed; returns 1 for any xp < threshold[1].
 */
export function levelForXp(xpTotal: number): number {
  let level = 1;
  for (let i = 1; i < LEVEL_XP_THRESHOLDS.length; i++) {
    if (xpTotal >= LEVEL_XP_THRESHOLDS[i]) {
      level = i + 1;
    } else {
      break;
    }
  }
  return level;
}

/**
 * Returns true if a user at `currentXp` crosses a level boundary after
 * gaining `delta` XP — i.e. a level-up should be triggered.
 */
export function isLevelUp(currentXp: number, delta: number): boolean {
  return levelForXp(currentXp + delta) > levelForXp(currentXp);
}

/**
 * Returns the XP required to reach the next level from `currentXp`,
 * or null if the user is at the maximum defined level.
 */
export function xpToNextLevel(currentXp: number): number | null {
  const currentLevel = levelForXp(currentXp);
  const nextThreshold = LEVEL_XP_THRESHOLDS[currentLevel]; // currentLevel is 1-indexed, array is 0-indexed
  return nextThreshold !== undefined ? nextThreshold - currentXp : null;
}

/**
 * Determines whether a streak should be considered broken given
 * the last response date and the current date.
 * Uses UTC dates; a grace period of STREAK_GRACE_DAYS is applied.
 */
export function isStreakBroken(
  lastResponseAt: Date | null,
  now: Date = new Date()
): boolean {
  if (!lastResponseAt) return false;
  const msSinceLast = now.getTime() - lastResponseAt.getTime();
  const daysSinceLast = msSinceLast / (1000 * 60 * 60 * 24);
  return daysSinceLast > 1 + STREAK_GRACE_DAYS;
}

/**
 * Returns the ISO date string (YYYY-MM-DD) for a scheduled practice date,
 * normalised to midnight UTC regardless of the input time component.
 */
export function toScheduledDate(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

/**
 * Returns the next weekly practice date (the coming Sunday in UTC)
 * relative to the given reference date.
 */
export function nextWeeklyDate(from: Date = new Date()): Date {
  const d = toScheduledDate(from);
  const daysUntilSunday = (7 - d.getUTCDay()) % 7 || 7;
  d.setUTCDate(d.getUTCDate() + daysUntilSunday);
  return d;
}

/**
 * Returns the next daily practice date (tomorrow in UTC).
 */
export function nextDailyDate(from: Date = new Date()): Date {
  const d = toScheduledDate(from);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

/**
 * Returns the appropriate next practice date based on cadence.
 */
export function nextPracticeDate(
  cadence: MessageCadence,
  from?: Date
): Date {
  return cadence === MessageCadence.DAILY
    ? nextDailyDate(from)
    : nextWeeklyDate(from);
}
