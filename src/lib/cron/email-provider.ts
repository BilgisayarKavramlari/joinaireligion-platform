/**
 * email-provider.ts
 *
 * Thin provider abstraction for outbound email.
 *
 * Activation:
 *   - Set RESEND_API_KEY and EMAIL_FROM in .env
 *   - Set EMAIL_SENDING_ENABLED=true in .env
 *   Only then will sendEmail() make actual HTTP calls.
 *
 * The route handler checks isSendingEnabled() before calling sendEmail().
 * If not enabled, it falls back to LOG_ONLY mode automatically.
 */

import { env } from "@/lib/env";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type SendEmailInput = {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  /** Optional provider-level tags for tracking */
  tags?: Record<string, string>;
};

export type SendEmailResult =
  | { ok: true; providerMsgId: string }
  | { ok: false; error: string };

// ─── Feature flag ──────────────────────────────────────────────────────────────

/**
 * Returns true only when all three conditions are met:
 *   1. EMAIL_SENDING_ENABLED === "true"
 *   2. RESEND_API_KEY is set
 *   3. EMAIL_FROM is set
 *
 * Keeping this as a function (rather than a constant) ensures it reads the
 * live env at call time during tests.
 */
export function isSendingEnabled(): boolean {
  return (
    env.EMAIL_SENDING_ENABLED === "true" &&
    !!env.RESEND_API_KEY &&
    !!env.EMAIL_FROM
  );
}

// ─── Provider: Resend ─────────────────────────────────────────────────────────

/**
 * Sends a single email via Resend.
 *
 * Do NOT remove the isSendingEnabled() gate that wraps callsites; it prevents
 * accidental live sends during local development and test runs.
 */
export async function sendEmail(
  input: SendEmailInput
): Promise<SendEmailResult> {
  // ── Safety gate (defence-in-depth; callers must also check isSendingEnabled) ──
  if (!isSendingEnabled()) {
    return {
      ok: false,
      error:
        "sendEmail called but EMAIL_SENDING_ENABLED is not 'true' or provider credentials are missing",
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "User-Agent": "joinaireligion-platform/1.0",
      },
      body: JSON.stringify({
        from: input.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(input.tags
          ? {
              tags: Object.entries(input.tags).map(([name, value]) => ({
                name,
                value,
              })),
            }
          : {}),
      }),
    });

    let payload: { id?: string } = {};
    try {
      payload = (await response.json()) as { id?: string };
    } catch {
      // Resend can return a non-JSON response during an upstream outage.
    }

    if (!response.ok) {
      return { ok: false, error: `resend_error_${response.status}` };
    }

    return { ok: true, providerMsgId: payload.id ?? "unknown" };
  } catch {
    return { ok: false, error: "resend_network_error" };
  }
}

// ─── Default from address ──────────────────────────────────────────────────────

/** Returns the configured FROM address, falling back to a safe default. */
export function getFromAddress(): string {
  return env.EMAIL_FROM ?? "noreply@joinai.app";
}
