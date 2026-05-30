/**
 * email-provider.ts
 *
 * Thin provider abstraction for outbound email.
 *
 * Current state:
 *   - Resend is not installed in this project.
 *   - The provider wrapper is ready to accept a Resend (or any other SDK)
 *     integration; the send function is a stub that returns a synthetic
 *     "success" result until the SDK is installed and sending is enabled.
 *
 * Activation:
 *   - Install the Resend SDK: `npm install resend`
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
 * Currently a STUB — returns a synthetic success result without making any
 * HTTP calls.  Replace the body with real Resend SDK code once the package
 * is installed:
 *
 * ```ts
 * import { Resend } from "resend";
 * const resend = new Resend(env.RESEND_API_KEY);
 * const { data, error } = await resend.emails.send({
 *   from: input.from,
 *   to:   input.to,
 *   subject: input.subject,
 *   html: input.html,
 *   text: input.text,
 * });
 * if (error) return { ok: false, error: error.message };
 * return { ok: true, providerMsgId: data?.id ?? "unknown" };
 * ```
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

  // ── STUB: replace with real Resend call after `npm install resend` ───────────
  // When this stub is active the route should never reach here because the
  // calling code checks isSendingEnabled() first.  This path exists only for
  // safety in case that guard is accidentally bypassed.
  void input; // suppress unused-variable warning until real code is added
  return {
    ok: false,
    error:
      "Resend SDK not installed — set EMAIL_SENDING_ENABLED=true only after running `npm install resend`",
  };
}

// ─── Default from address ──────────────────────────────────────────────────────

/** Returns the configured FROM address, falling back to a safe default. */
export function getFromAddress(): string {
  return env.EMAIL_FROM ?? "noreply@joinai.app";
}
