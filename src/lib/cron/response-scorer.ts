/**
 * response-scorer.ts
 *
 * Deterministic heuristic scoring for PracticeResponse text.
 *
 * Produces an integer score in the range 0–5 with no external calls.
 * When the OpenAI scoring agent is implemented it will replace the
 * scoreResponse() call site in the cron route; this file's types and
 * constants will remain the authoritative definition of the scale.
 *
 * Score semantics (per task spec):
 *   0 — empty, too short to evaluate, or clear spam/filler
 *   1 — very short but recognisable as a genuine attempt
 *   2 — short-to-medium, minimal engagement
 *   3 — medium, shows genuine reflection on the prompt
 *   4 — long, specific, reflective
 *   5 — strong, structured, detailed self-inquiry
 *
 * XP per score (this system, per task spec):
 *   XP awarded = score (integer 0–5)
 *   This keeps the initial system simple; the richer XP_PER_SCORE table
 *   in src/lib/journey-types.ts is available for a future upgrade.
 *
 * Level progression (per task spec):
 *   Every 300 XP → +1 level, capped at level 10.
 *   Computed by computeLevel() below.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** XP awarded equals the integer score (task spec: "XP equal to score, max 5"). */
export const XP_PER_SCORE_UNIT = 1; // multiplier; xpEarned = score * XP_PER_SCORE_UNIT

/** XP required to advance one level (task spec: "300 XP per level"). */
export const XP_PER_LEVEL = 300;

/** Maximum level a user can reach (task spec: "max level 10"). */
export const MAX_LEVEL = 10;

/** Maximum score value. */
export const MAX_SCORE = 5;

// ─── Score result type ────────────────────────────────────────────────────────

export type Score = 0 | 1 | 2 | 3 | 4 | 5;

export type ScoreResult = {
  score: Score;
  /** Machine-readable reason for the score — useful for diagnostics. */
  reason:
    | "empty"
    | "spam"
    | "very_short"
    | "short"
    | "medium"
    | "long"
    | "strong"
    | "repetitive_long";
};

// ─── Spam detectors ───────────────────────────────────────────────────────────

/** Patterns that identify low-effort or machine-generated filler. */
const SPAM_PATTERNS: RegExp[] = [
  /^(.)\1{14,}$/,                       // 15+ repeated identical chars: "aaaaaaa…"
  /^[^a-zA-ZÀ-ɏЀ-ӿ؀-ۿ一-鿿]{15,}$/, // no letters at all
  /^(test|asdf|qwerty|1234|hello|hi|ok|yes|no|done)[\s.!?]*$/i, // single placeholder word
];

function looksLikeSpam(text: string): boolean {
  return SPAM_PATTERNS.some((p) => p.test(text));
}

/**
 * Measures lexical diversity: unique-word ratio.
 * A ratio below 0.15 on a long text signals heavy repetition.
 */
function uniqueWordRatio(text: string): number {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9À-ɏЀ-ӿ؀-ۿ\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return 1;
  return new Set(words).size / words.length;
}

// ─── Pure scoring function ────────────────────────────────────────────────────

/**
 * Scores a practice response using deterministic heuristics.
 *
 * Thresholds are intentionally conservative so that genuine short
 * responses are not penalised harshly.  The aim is to distinguish
 * empty/spam from minimal effort from genuine reflection.
 *
 * Length thresholds (characters after trimming):
 *   0         → 0 (empty)
 *   spam      → 0
 *   1–19      → 1 (too short)
 *   20–79     → 2 (short, minimal engagement)
 *   80–249    → 3 (medium, genuine reflection possible)
 *   250–599   → 4 (long, likely reflective)
 *   600+      → 5 (strong) unless uniqueWordRatio < 0.15 → 3 (repetitive)
 */
export function scoreResponse(text: string): ScoreResult {
  const trimmed = text.trim();
  const len = trimmed.length;

  if (len === 0) return { score: 0, reason: "empty" };
  if (looksLikeSpam(trimmed)) return { score: 0, reason: "spam" };
  if (len < 20) return { score: 1, reason: "very_short" };
  if (len < 80) return { score: 2, reason: "short" };
  if (len < 250) return { score: 3, reason: "medium" };
  if (len < 600) return { score: 4, reason: "long" };

  // 600+ chars: check for repetition
  if (uniqueWordRatio(trimmed) < 0.15) {
    return { score: 3, reason: "repetitive_long" };
  }

  return { score: 5, reason: "strong" };
}

// ─── XP calculation ───────────────────────────────────────────────────────────

/**
 * Returns XP to award for a given score.
 * xpEarned = score * XP_PER_SCORE_UNIT (currently 1:1).
 */
export function xpForScoreValue(score: Score): number {
  return Math.max(0, Math.min(MAX_SCORE, score)) * XP_PER_SCORE_UNIT;
}

// ─── Level computation ────────────────────────────────────────────────────────

/**
 * Returns the level corresponding to a total XP value.
 *
 * Rule: level = floor(xpTotal / XP_PER_LEVEL) + 1, capped at MAX_LEVEL.
 *
 * Examples (XP_PER_LEVEL = 300, MAX_LEVEL = 10):
 *   0–299   → level 1
 *   300–599 → level 2
 *   …
 *   2700+   → level 10 (capped)
 */
export function computeLevel(xpTotal: number): number {
  if (xpTotal < 0) return 1;
  return Math.min(MAX_LEVEL, Math.floor(xpTotal / XP_PER_LEVEL) + 1);
}
