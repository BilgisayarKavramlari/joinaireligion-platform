/**
 * eligibility.ts
 *
 * Pure functions that determine which users receive practice messages and
 * when.  No database calls — designed for easy unit testing.
 *
 * Rules:
 *   - Eligible: emailVerifiedAt is not null, practice email is enabled,
 *               and the user has not globally unsubscribed
 *   - Cadence:  ACTIVE Initiate subscription → DAILY
 *               all others                   → WEEKLY
 *   - Daily scheduled date:  today at UTC midnight
 *   - Weekly scheduled date: the Monday of the current ISO week at UTC midnight
 *     (same date for every day in the week → prevents duplicates via unique constraint)
 */

import { MessageCadence, SubscriptionStatus } from "@prisma/client";
import { resolveEntitlements } from "@/lib/membership";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Minimal user shape required to compute eligibility and cadence. */
export type EligibilityUser = {
  emailVerifiedAt: Date | null;
  emailOptIn: boolean;
  unsubscribedAt: Date | null;
  subscription: { status: SubscriptionStatus; planCode?: string | null; providerPriceId?: string | null } | null;
};

// ─── Eligibility ──────────────────────────────────────────────────────────────

/**
 * Returns true if the user should receive a practice message.
 *
 * Conditions:
 *   1. Email must be verified (emailVerifiedAt !== null).
 *   2. Lesson/practice email preference must be enabled.
 *   3. User must not have globally unsubscribed (unsubscribedAt === null).
 */
export function isEligible(user: EligibilityUser): boolean {
  return user.emailVerifiedAt !== null && user.emailOptIn && user.unsubscribedAt === null;
}

// ─── Cadence ──────────────────────────────────────────────────────────────────

/**
 * Returns the appropriate message cadence for a user.
 *
 * - ACTIVE Initiate subscription → DAILY  (one practice per calendar day)
 * - Everything else              → WEEKLY (one practice per ISO week)
 *
 * TRIAL and PAST_DUE are treated as free-tier to avoid generating expensive
 * daily AI content for users who may not convert.
 */
export function getCadence(user: EligibilityUser): MessageCadence {
  return resolveEntitlements(user.subscription).dailyPractice
    ? MessageCadence.DAILY
    : MessageCadence.WEEKLY;
}

// ─── Scheduled dates ──────────────────────────────────────────────────────────

/**
 * Returns UTC midnight of the given date (or today if not specified).
 * Used as the scheduled date for daily practices.
 */
export function dailyScheduledDate(now: Date = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

/**
 * Returns the Monday of the current ISO week at UTC midnight.
 *
 * This is the canonical scheduled date for weekly practices.  Because every
 * day in the same week maps to the same Monday date, the
 * @@unique([userId, cadence, scheduledDate]) constraint on PracticeMessage
 * prevents duplicate weekly practices even if the cron runs multiple times
 * per week.
 *
 * Examples (any day in week of 2024-01-15):
 *   Mon 2024-01-15 → 2024-01-15
 *   Wed 2024-01-17 → 2024-01-15
 *   Sun 2024-01-21 → 2024-01-15
 */
export function weeklyScheduledDate(now: Date = new Date()): Date {
  const d = dailyScheduledDate(now);
  // getUTCDay(): 0 = Sunday, 1 = Monday, …, 6 = Saturday
  const dow = d.getUTCDay();
  const daysToMonday = dow === 0 ? 6 : dow - 1;
  d.setUTCDate(d.getUTCDate() - daysToMonday);
  return d;
}

/**
 * Convenience wrapper: returns the correct scheduled date for a given cadence.
 */
export function getScheduledDate(
  cadence: MessageCadence,
  now: Date = new Date()
): Date {
  return cadence === MessageCadence.DAILY
    ? dailyScheduledDate(now)
    : weeklyScheduledDate(now);
}
