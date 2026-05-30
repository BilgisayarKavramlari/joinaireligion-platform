/**
 * xp-service.ts
 *
 * Database service for XP award, ledger persistence, and level progression.
 *
 * Design principles:
 *   - Idempotent: if an XpLedger entry already exists for (source, sourceId),
 *     the function returns immediately without mutating any record.
 *   - Append-only: XpLedger entries are only ever created, never updated or
 *     deleted.  This preserves a full audit trail.
 *   - Transactionless-safe for single-user ops: reads then writes are safe
 *     because the cron processes one response at a time.  If parallel
 *     execution is needed in future, wrap in db.$transaction.
 *   - Does NOT call scoreResponse — scoring is the caller's responsibility.
 *
 * Called by /api/cron/score-practice-responses for each unscored response.
 */

import type { PrismaClient } from "@prisma/client";
import { XpSource } from "@prisma/client";
import { computeLevel } from "@/lib/cron/response-scorer";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AwardXpInput = {
  userId: string;
  /** XP delta to record (must be ≥ 0 for this use-case). */
  amount: number;
  /** XpSource enum value identifying what triggered this award. */
  source: XpSource;
  /**
   * ID of the originating record (e.g. PracticeResponse.id).
   * Used as the idempotency key: if an XpLedger entry already exists with
   * the same (source, sourceId), the award is silently skipped.
   */
  sourceId: string;
  /** Optional human-readable note stored on the ledger entry. */
  notes?: string;
};

export type AwardXpResult =
  | {
      skipped: true;
      reason: "already_awarded" | "zero_amount";
    }
  | {
      skipped: false;
      ledgerId: string;
      xpBefore: number;
      xpAfter: number;
      levelBefore: number;
      levelAfter: number;
      leveledUp: boolean;
    };

// ─── Service function ─────────────────────────────────────────────────────────

/**
 * Awards XP to a user, writes an XpLedger entry, and updates
 * User.xpTotal / User.currentLevel / UserJourneyState.
 *
 * Idempotency: a (source, sourceId) pair is awarded at most once.
 */
export async function awardXp(
  db: PrismaClient,
  input: AwardXpInput
): Promise<AwardXpResult> {
  const { userId, amount, source, sourceId, notes } = input;

  // ── 0. Skip zero-amount awards ───────────────────────────────────────────
  if (amount === 0) {
    return { skipped: true, reason: "zero_amount" };
  }

  // ── 1. Idempotency check ─────────────────────────────────────────────────
  const existingEntry = await db.xpLedger.findFirst({
    where: { source, sourceId },
    select: { id: true },
  });
  if (existingEntry) {
    return { skipped: true, reason: "already_awarded" };
  }

  // ── 2. Read current user state ───────────────────────────────────────────
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { xpTotal: true, currentLevel: true },
  });
  if (!user) {
    // Caller should validate userId; log and skip rather than throw
    return { skipped: true, reason: "already_awarded" }; // safe fallback
  }

  const xpBefore = user.xpTotal;
  const xpAfter = xpBefore + amount;
  const levelBefore = user.currentLevel;
  const levelAfter = computeLevel(xpAfter);
  const leveledUp = levelAfter > levelBefore;

  // ── 3. Write XpLedger entry (append-only) ────────────────────────────────
  const ledgerEntry = await db.xpLedger.create({
    data: {
      userId,
      amount,
      source,
      sourceId,
      balanceBefore: xpBefore,
      balanceAfter: xpAfter,
      notes: notes ?? null,
    },
    select: { id: true },
  });

  // ── 4. Update User.xpTotal and User.currentLevel ─────────────────────────
  await db.user.update({
    where: { id: userId },
    data: {
      xpTotal: xpAfter,
      currentLevel: levelAfter,
    },
  });

  // ── 5. Upsert UserJourneyState ───────────────────────────────────────────
  // Update response counters and level-up flag; do not overwrite scheduling fields.
  const now = new Date();
  await db.userJourneyState.upsert({
    where: { userId },
    create: {
      userId,
      totalResponsesSubmitted: 1,
      lastResponseSubmittedAt: now,
      pendingLevelUp: leveledUp,
      lastLevelUpAt: leveledUp ? now : null,
    },
    update: {
      totalResponsesSubmitted: { increment: 1 },
      lastResponseSubmittedAt: now,
      // Only set pendingLevelUp to true — the level-up handler clears it.
      ...(leveledUp ? { pendingLevelUp: true, lastLevelUpAt: now } : {}),
    },
  });

  return {
    skipped: false,
    ledgerId: ledgerEntry.id,
    xpBefore,
    xpAfter,
    levelBefore,
    levelAfter,
    leveledUp,
  };
}
