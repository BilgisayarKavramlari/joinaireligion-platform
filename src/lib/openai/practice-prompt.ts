/**
 * src/lib/openai/practice-prompt.ts
 *
 * Prompt engineering and output validation for AI-generated practice content.
 *
 * Exports:
 *   - OpenAIPracticeOutput  — the typed structure we expect from the model
 *   - validatePracticeOutput — runtime type-guard (no external schema library)
 *   - buildSystemPrompt      — the instruction/system message
 *   - buildUserPrompt        — compact per-user context message
 *   - PRACTICE_PROMPT_SPEC   — name/version/body for PromptVersion record
 *
 * No OpenAI SDK imports here — this module is pure (serialisable prompts
 * and types only) so it is easy to snapshot-test without mocking.
 */

import type { PracticeContext } from "@/lib/cron/practice-builder";

// ─── Output type ──────────────────────────────────────────────────────────────

/**
 * The JSON structure the model must return.
 *
 * All fields are required.  The validator below enforces this at runtime
 * before the output is used.
 */
export type OpenAIPracticeOutput = {
  /** 3–8 word evocative title for the practice session. */
  title: string;
  /**
   * A short contemplative reading (80–200 words) drawn from the user's
   * tradition or a universal wisdom perspective.  Sets the tone and
   * context before the practice instruction.
   */
  reading: string;
  /**
   * Clear, actionable practice instruction (60–150 words).
   * Should describe exactly what the practitioner is to do.
   */
  practice: string;
  /**
   * A single open-ended reflection question (1–2 sentences) to engage
   * after the practice.
   */
  reflectionPrompt: string;
  /**
   * One brief, warm safety reassurance sentence — e.g. acknowledging
   * that difficult emotions may arise and that this is normal.
   */
  safetyNote: string;
};

// ─── Runtime validator (type-guard) ───────────────────────────────────────────

/**
 * Validates that an unknown value matches OpenAIPracticeOutput.
 * All five string fields must be present and non-empty.
 * Returns false for any malformed model output so the caller can fall back.
 */
export function validatePracticeOutput(
  data: unknown
): data is OpenAIPracticeOutput {
  if (typeof data !== "object" || data === null) return false;

  const d = data as Record<string, unknown>;
  const requiredStringFields: (keyof OpenAIPracticeOutput)[] = [
    "title",
    "reading",
    "practice",
    "reflectionPrompt",
    "safetyNote",
  ];

  for (const field of requiredStringFields) {
    if (typeof d[field] !== "string" || (d[field] as string).trim().length === 0) {
      return false;
    }
  }

  // Sanity-check lengths to catch truncated or nonsensical outputs
  if ((d.title as string).length > 200) return false;
  if ((d.reading as string).length < 30) return false;
  if ((d.practice as string).length < 30) return false;

  return true;
}

// ─── Prompt spec (recorded in PromptVersion table) ───────────────────────────

/**
 * Immutable spec for the v1 practice-generation prompt.
 * Increment `version` whenever the system prompt changes materially —
 * this preserves the audit trail in PromptVersion.
 */
export const PRACTICE_PROMPT_SPEC = {
  name: "practice-gen",
  version: 1,
  body: "gpt-4o-mini · JSON mode · fields: title, reading, practice, reflectionPrompt, safetyNote",
} as const;

/** Spec for the deterministic placeholder path. */
export const PLACEHOLDER_PROMPT_SPEC = {
  name: "practice-placeholder",
  version: 1,
  body: "Deterministic template pool — no AI calls",
} as const;

// ─── System prompt ────────────────────────────────────────────────────────────

/**
 * Builds the system prompt for practice generation.
 * The system prompt does not change per-user — it defines the role,
 * output format, and quality constraints.
 */
export function buildSystemPrompt(): string {
  return `You are a compassionate contemplative guide for an interfaith spiritual practice platform called JoinAI Religion.

Your task is to generate a personalised daily or weekly practice for a specific seeker based on their profile.

You MUST respond with ONLY a valid JSON object using this exact structure:
{
  "title": "<3–8 word evocative title>",
  "reading": "<80–200 word contemplative reading appropriate to the seeker's tradition>",
  "practice": "<60–150 word clear actionable instruction for what the seeker should do>",
  "reflectionPrompt": "<1–2 sentence open-ended reflection question for after the practice>",
  "safetyNote": "<1 warm sentence acknowledging that difficult feelings may arise and that is normal>"
}

Guidelines:
- Honour the seeker's stated tradition without imposing it; use universal language if tradition is absent.
- The reading should feel like a timeless excerpt from wisdom literature.
- The practice instruction should be specific and achievable in 10–30 minutes.
- The reflection prompt should invite genuine self-inquiry, not a yes/no answer.
- The safety note should be warm, brief, and non-clinical.
- Do NOT use lists, markdown, or any formatting — plain sentences only inside each JSON value.
- Do NOT include any keys beyond the five listed above.`;
}

// ─── Compact user context ─────────────────────────────────────────────────────

/**
 * Builds a compact user-context string from PracticeContext.
 *
 * Design goals:
 *   - Stays under ~400 tokens to leave the bulk of the model budget for output.
 *   - Includes only information that could meaningfully personalise the practice.
 *   - Snippets from past responses prevent repetition across sessions.
 */
export function buildUserPrompt(ctx: PracticeContext): string {
  const lines: string[] = [];

  lines.push(`== Seeker Profile ==`);
  lines.push(`Name: ${ctx.displayName}`);
  lines.push(`Journey level: ${ctx.level}`);
  if (ctx.tradition) lines.push(`Tradition: ${ctx.tradition}`);
  if (ctx.intent) lines.push(`Primary intent: ${ctx.intent}`);
  lines.push(`Practice cadence: ${ctx.cadence === "DAILY" ? "daily" : "weekly"}`);

  if (ctx.recentResponseSnippets.length > 0) {
    lines.push(`\n== Recent reflections (last ${ctx.recentResponseSnippets.length}) ==`);
    ctx.recentResponseSnippets.forEach((s, i) => {
      lines.push(`  ${i + 1}. "${s.slice(0, 100)}"`);
    });
  }

  if (ctx.recentDialogueSnippets.length > 0) {
    lines.push(`\n== Recent questions asked ==`);
    ctx.recentDialogueSnippets.forEach((s, i) => {
      lines.push(`  ${i + 1}. "${s.slice(0, 80)}"`);
    });
  }

  lines.push(`\n== Task ==`);
  lines.push(
    `Generate a personalised ${ctx.cadence === "DAILY" ? "daily" : "weekly"} practice for ${ctx.displayName}. ` +
      `The date is ${ctx.scheduledDate.toISOString().slice(0, 10)}. ` +
      `Do not repeat themes from the recent reflections above if possible.`
  );

  return lines.join("\n");
}
