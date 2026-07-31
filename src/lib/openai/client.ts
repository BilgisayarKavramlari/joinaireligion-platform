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

import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
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
const execFileAsync = promisify(execFile);

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

type SpeechResult = {
  audio: Uint8Array | null;
  error: string | null;
  model: "gpt-4o-mini-tts" | "tts-1" | "espeak-ng" | null;
  voice: "marin" | "alloy" | "en-us" | null;
};

async function createLocalSpeech(input: string, upstreamError?: string): Promise<SpeechResult> {
  const directory = await mkdtemp(path.join(tmpdir(), "joinai-speech-"));
  const wavPath = path.join(directory, "speech.wav");
  const mp3Path = path.join(directory, "speech.mp3");
  try {
    await execFileAsync("espeak-ng", ["-v", "en-us", "-s", "145", "-p", "45", "-w", wavPath, input], {
      timeout: TIMEOUT_MS,
      maxBuffer: 1_000_000,
    });
    await execFileAsync("ffmpeg", [
      "-loglevel", "error", "-nostdin", "-y", "-i", wavPath,
      "-codec:a", "libmp3lame", "-q:a", "4", mp3Path,
    ], { timeout: TIMEOUT_MS, maxBuffer: 1_000_000 });
    return {
      audio: new Uint8Array(await readFile(mp3Path)),
      error: null,
      model: "espeak-ng",
      voice: "en-us",
    };
  } catch (localError) {
    const localMessage = localError instanceof Error ? localError.message : String(localError);
    const combined = [upstreamError, `local TTS failed: ${localMessage}`].filter(Boolean).join("; ");
    return { audio: null, error: combined.slice(0, 500), model: null, voice: null };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export async function createOpenAISpeech(input: string): Promise<SpeechResult> {
  if (!isOpenAIEnabled()) {
    return createLocalSpeech(input, "OPENAI_API_KEY not configured");
  }
  try {
    const response = await getClient().audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "marin",
      input,
      instructions: "Speak calmly, clearly, and warmly at a measured pace. Sound educational and reflective, never prophetic, therapeutic, or authoritative. Briefly pause between sections.",
      response_format: "mp3",
    });
    return {
      audio: new Uint8Array(await response.arrayBuffer()),
      error: null,
      model: "gpt-4o-mini-tts",
      voice: "marin",
    };
  } catch (preferredError) {
    // Some OpenAI projects do not yet have access to gpt-4o-mini-tts. Keep the
    // publisher operational with the broadly available TTS model while
    // recording the actual model and voice in the public episode metadata.
    try {
      const response = await getClient().audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input,
        response_format: "mp3",
      });
      return {
        audio: new Uint8Array(await response.arrayBuffer()),
        error: null,
        model: "tts-1",
        voice: "alloy",
      };
    } catch (fallbackError) {
      const preferredMessage = preferredError instanceof Error ? preferredError.message : String(preferredError);
      const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      return createLocalSpeech(
        input,
        `Preferred TTS failed: ${preferredMessage}; fallback TTS failed: ${fallbackMessage}`
      );
    }
  }
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
