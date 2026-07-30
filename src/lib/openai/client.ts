/**
 * src/lib/openai/client.ts
 *
 * Thin wrapper around the OpenAI SDK.
 *
 * Responsibilities:
 *   - Lazy singleton: the OpenAI client is only instantiated when
 *     isOpenAIEnabled() is true; no object is created at module load time.
 *   - Key safety: OPENAI_API_KEY is consumed here and never re-exported.
 *   - Timeout + error boundary: all errors are caught and converted to null
 *     so callers can fall back without try/catch boilerplate.
 *   - JSON mode: always requests `response_format: { type: "json_object" }`
 *     so the response is guaranteed parseable JSON.
 *
 * Usage:
 *   import { isOpenAIEnabled, callOpenAIJson } from "@/lib/openai/client";
 *
 *   if (isOpenAIEnabled()) {
 *     const data = await callOpenAIJson(systemPrompt, userPrompt);
 *     if (data) { ... }
 *   }
 */

import OpenAI from "openai";
import { env } from "@/lib/env";

// ─── Config ───────────────────────────────────────────────────────────────────

const DEFAULT_MODEL = "gpt-4o-mini";
// Long-form multilingual JSON can legitimately take longer than a short chat
// completion. Keep one bounded attempt and let the scheduled worker retry the
// whole idempotent job later instead of multiplying latency inside the SDK.
const TIMEOUT_MS = 120_000;
// Multilingual article JSON includes a full body, SEO fields, and FAQ blocks.
// Short caps can truncate long-form source articles and valid Cyrillic/CJK translations.
const MAX_TOKENS = 8_000;

// ─── Lazy singleton ───────────────────────────────────────────────────────────

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    if (!env.OPENAI_API_KEY) {
      throw new Error(
        "OpenAI client requested but OPENAI_API_KEY is not set. " +
          "Check isOpenAIEnabled() before calling getClient()."
      );
    }
    _client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      timeout: TIMEOUT_MS,
      maxRetries: 0,
    });
  }
  return _client;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns true when OPENAI_API_KEY is configured in the environment.
 * Callers should check this before invoking callOpenAIJson().
 */
export function isOpenAIEnabled(): boolean {
  return Boolean(env.OPENAI_API_KEY);
}

/**
 * Calls the OpenAI Chat Completions API in JSON mode.
 *
 * @param systemPrompt  The system/instruction prompt.
 * @param userPrompt    The user-turn content describing the task.
 * @param model         Optional model override (defaults to gpt-4o-mini).
 * @returns             Parsed JSON as `unknown`, or `null` on any error.
 *
 * Errors are silently swallowed here; the caller's fallback logic handles
 * them.  If you need the raw error for logging, use callOpenAIJsonWithError.
 */
export async function callOpenAIJson(
  systemPrompt: string,
  userPrompt: string,
  model: string = DEFAULT_MODEL
): Promise<unknown | null> {
  const result = await callOpenAIJsonWithError(systemPrompt, userPrompt, model);
  return result.data;
}

/**
 * Like callOpenAIJson but also returns the error so callers can log it.
 */
export async function callOpenAIJsonWithError(
  systemPrompt: string,
  userPrompt: string,
  model: string = DEFAULT_MODEL
): Promise<{ data: unknown | null; error: string | null }> {
  if (!isOpenAIEnabled()) {
    return { data: null, error: "OPENAI_API_KEY not configured" };
  }

  try {
    const client = getClient();
    const completion = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      max_tokens: MAX_TOKENS,
      temperature: 0.85,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const choice = completion.choices[0];
    if (choice?.finish_reason === "length") {
      return { data: null, error: `OpenAI output exceeded ${MAX_TOKENS} tokens` };
    }

    const raw = choice?.message?.content;
    if (!raw) {
      return { data: null, error: "OpenAI returned empty content" };
    }

    const parsed = JSON.parse(raw) as unknown;
    return { data: parsed, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { data: null, error: msg };
  }
}
