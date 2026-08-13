export type ReflectionModerationFailureCode =
  | "not_configured"
  | "authorization"
  | "rate_limited"
  | "provider_rejected"
  | "provider_error"
  | "timeout"
  | "network"
  | "invalid_response";

export type ReflectionModerationResult =
  | { ok: true; flagged: boolean; flags: string[] }
  | { ok: false; failureCode: ReflectionModerationFailureCode; httpStatus: number | null };

type ModerationResponse = {
  results?: Array<{ flagged?: boolean; categories?: Record<string, boolean> }>;
};

function failureCodeForStatus(status: number): ReflectionModerationFailureCode {
  if (status === 401 || status === 403) return "authorization";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "provider_error";
  return "provider_rejected";
}

/**
 * Calls the provider moderation boundary without logging or returning request
 * text or provider response bodies. Operational diagnostics are deliberately
 * reduced to a stable failure category and HTTP status.
 */
export async function moderateReflectionText(
  apiKey: string,
  input: string,
  timeoutMs = 15_000,
): Promise<ReflectionModerationResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "omni-moderation-latest", input }),
      signal: controller.signal,
    });
    if (!response.ok) {
      return { ok: false, failureCode: failureCodeForStatus(response.status), httpStatus: response.status };
    }
    const payload = await response.json().catch(() => null) as ModerationResponse | null;
    const result = payload?.results?.[0];
    if (!result) return { ok: false, failureCode: "invalid_response", httpStatus: response.status };
    const flags = Object.entries(result.categories || {})
      .filter(([, active]) => active)
      .map(([name]) => name)
      .slice(0, 20);
    return { ok: true, flagged: Boolean(result.flagged), flags };
  } catch (error) {
    return {
      ok: false,
      failureCode: error instanceof Error && error.name === "AbortError" ? "timeout" : "network",
      httpStatus: null,
    };
  } finally {
    clearTimeout(timeout);
  }
}
