/**
 * support-ticket-severity.ts
 *
 * Deterministic severity assignment for support / feedback text.
 *
 * This module is pure and side-effect free:
 * - no database access
 * - no network access
 * - no OpenAI calls
 *
 * It uses the already-classified support ticket category plus message text
 * to assign a coarse severity level suitable for later triage integration.
 */

import type { SupportTicketCategory } from "@/lib/cron/support-ticket-classifier";

export type SupportTicketSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

const CRITICAL_PATTERNS: RegExp[] = [
  /\b(?:breach|hacked|hack|compromised|unauthorized access|security issue|security bug)\b/i,
  /\b(?:privacy|gdpr|delete my data|erase my data|remove my data|legal threat|lawsuit|attorney|police)\b/i,
  /\b(?:threat|abuse|harassment|blackmail|suicide|self-harm|violence)\b/i,
  /\b(?:locked out completely|cannot sign in at all|can'?t sign in at all)\b/i,
];

const HIGH_PATTERNS: RegExp[] = [
  /\b(?:refund|charged twice|double charged|payment failed|card declined|billing problem|subscription problem)\b/i,
  /\b(?:cannot log in|can'?t log in|cannot access my account|reset password|verify email|verification email)\b/i,
  /\b(?:onboarding broken|cannot access lesson|lesson access|sign out broken|password update)\b/i,
  /\b(?:500 error|checkout broken|broken flow|stuck on onboarding|stuck on login)\b/i,
];

const LOW_PATTERNS: RegExp[] = [
  /\b(?:typo|spelling|copy issue|wording|label text|cosmetic|spacing|alignment|minor layout)\b/i,
  /\b(?:small translation issue|minor translation|awkward translation)\b/i,
];

const INFORMATIONAL_PATTERNS: RegExp[] = [
  /\b(?:how do i|where can i|question about|just wondering|informational|curious)\b/i,
];

const SPAM_HIGH_PATTERNS: RegExp[] = [
  /\b(?:abuse|threat|harassment|legal)\b/i,
];

const CONTENT_BLOCKER_PATTERNS: RegExp[] = [
  /\b(?:empty lesson|wrong lesson|cannot access lesson|can'?t access lesson|lesson content at all)\b/i,
];

const UX_BLOCKER_PATTERNS: RegExp[] = [
  /\b(?:cannot find|can'?t find|blocked|stuck|core flow)\b/i,
];

function normalize(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

export function classifySupportTicketSeverity(
  text: string,
  category: SupportTicketCategory
): SupportTicketSeverity {
  const normalized = normalize(text);

  if (!normalized) return "LOW";
  if (matchesAny(normalized, CRITICAL_PATTERNS)) return "CRITICAL";

  switch (category) {
    case "SPAM":
      return matchesAny(normalized, SPAM_HIGH_PATTERNS)
        ? "HIGH"
        : "LOW";

    case "BILLING":
      return matchesAny(normalized, INFORMATIONAL_PATTERNS) ? "MEDIUM" : "HIGH";

    case "ACCOUNT":
      return matchesAny(normalized, HIGH_PATTERNS) ? "HIGH" : "MEDIUM";

    case "BUG":
      return matchesAny(normalized, HIGH_PATTERNS) ? "HIGH" : "MEDIUM";

    case "CONTENT":
      return matchesAny(normalized, CONTENT_BLOCKER_PATTERNS)
        ? "HIGH"
        : matchesAny(normalized, LOW_PATTERNS)
          ? "LOW"
          : "MEDIUM";

    case "I18N":
      return matchesAny(normalized, LOW_PATTERNS)
        ? "LOW"
        : /\b(?:still in english|wrong language everywhere|entire page untranslated|onboarding.*english)\b/i.test(normalized)
          ? "MEDIUM"
          : "LOW";

    case "UX":
      return matchesAny(normalized, UX_BLOCKER_PATTERNS)
        ? "MEDIUM"
        : "LOW";

    case "OTHER":
      return matchesAny(normalized, HIGH_PATTERNS) ? "HIGH" : "MEDIUM";
  }
}
