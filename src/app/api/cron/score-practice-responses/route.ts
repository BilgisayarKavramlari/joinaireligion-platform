/**
 * POST /api/cron/score-practice-responses
 *
 * Scores all PracticeResponse records where score IS NULL, awards XP,
 * updates the XP ledger, and advances user levels as required.
 *
 * Authentication: Bearer token in Authorization header must match CRON_SECRET.
 *
 * Scoring: deterministic heuristic (no OpenAI).  Replace scoreResponse()
 * with an AI call when that layer is ready; the XP and level logic below
 * remains unchanged.
 *
 * Idempotency:
 *   - Only responses where score IS NULL are selected.
 *   - Once a response is scored it will not be reprocessed.
 *   - XP is gated by an XpLedger existence check (source + sourceId).
 *   - Re-running the cron safely produces zero additional mutations.
 *
 * Duplicate XP prevention:
 *   awardXp() in xp-service.ts checks whether an XpLedger entry already
 *   exists for (XpSource.PRACTICE_RESPONSE, response.id) before writing.
 *   Even if this route is called twice simultaneously, each response will
 *   produce at most one ledger entry.
 */

export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { AgentRunStatus, XpSource } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { scoreResponse, xpForScoreValue } from "@/lib/cron/response-scorer";
import { awardXp } from "@/lib/cron/xp-service";

// ─── Prisma select ─────────────────────────────────────────────────────────────

const responseSelect = {
  id: true,
  userId: true,
  practiceMessageId: true,
  responseText: true,
  createdAt: true,
} satisfies Prisma.PracticeResponseSelect;

type UnscoredResponse = Prisma.PracticeResponseGetPayload<{
  select: typeof responseSelect;
}>;

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  // ── 1. Authenticate ────────────────────────────────────────────────────────
  const authHeader = request.headers.get("authorization");
  if (
    !env.CRON_SECRET ||
    !authHeader ||
    authHeader !== `Bearer ${env.CRON_SECRET}`
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // ── 2. Open AgentRun record ────────────────────────────────────────────────
  const agentRun = await db.agentRun.create({
    data: {
      agentName: "response-scorer",
      taskType: "SCORE_PRACTICE_RESPONSES",
      status: AgentRunStatus.RUNNING,
      startedAt: now,
      input: { triggerDate: now.toISOString(), scoringMethod: "heuristic" },
    },
  });

  // ── 3. Fetch unscored responses ────────────────────────────────────────────
  let responses: UnscoredResponse[];
  try {
    responses = await db.practiceResponse.findMany({
      where: { score: null },
      select: responseSelect,
      orderBy: { createdAt: "asc" },
    });
  } catch (fetchError) {
    const msg =
      fetchError instanceof Error ? fetchError.message : String(fetchError);
    await db.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: AgentRunStatus.FAILED,
        errorMessage: `Response fetch failed: ${msg}`,
        completedAt: new Date(),
        durationMs: Date.now() - now.getTime(),
        output: { scored: 0, skipped: 0, errors: 1 },
      },
    });
    return Response.json(
      { error: "Failed to fetch unscored responses", detail: msg },
      { status: 500 }
    );
  }

  // ── 4. Score each response ─────────────────────────────────────────────────
  let scored = 0;
  let xpSkipped = 0; // already-awarded XP entries skipped
  let levelUps = 0;
  const errors: string[] = [];

  for (const response of responses) {
    try {
      // 4a. Deterministic score
      const { score, reason } = scoreResponse(response.responseText);
      const xpEarned = xpForScoreValue(score);

      // 4b. Persist score on PracticeResponse
      await db.practiceResponse.update({
        where: { id: response.id },
        data: {
          score,
          xpEarned,
          scoredAt: new Date(),
          scoringAgentRunId: agentRun.id,
        },
      });

      // 4c. Award XP (idempotent — skips if already recorded)
      const xpResult = await awardXp(db, {
        userId: response.userId,
        amount: xpEarned,
        source: XpSource.PRACTICE_RESPONSE,
        sourceId: response.id,
        notes: `score=${score} reason=${reason}`,
      });

      if (xpResult.skipped) {
        xpSkipped++;
      } else if (xpResult.leveledUp) {
        levelUps++;
      }

      scored++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`response ${response.id}: ${msg}`);
    }
  }

  // ── 5. Close AgentRun ──────────────────────────────────────────────────────
  const hasErrors = errors.length > 0;
  await db.agentRun.update({
    where: { id: agentRun.id },
    data: {
      status: hasErrors ? AgentRunStatus.FAILED : AgentRunStatus.SUCCESS,
      completedAt: new Date(),
      durationMs: Date.now() - now.getTime(),
      errorMessage: hasErrors ? errors.join("; ") : null,
      output: {
        total: responses.length,
        scored,
        xpSkipped,
        levelUps,
        errors: errors.length,
      },
    },
  });

  return Response.json({
    ok: true,
    agentRunId: agentRun.id,
    total: responses.length,
    scored,
    xpSkipped,
    levelUps,
    errors: hasErrors ? errors : undefined,
  });
}
