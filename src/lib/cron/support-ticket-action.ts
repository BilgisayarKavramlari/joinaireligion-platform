/**
 * support-ticket-action.ts
 *
 * Deterministic recommended-action assignment for support / feedback text.
 *
 * This module is pure and side-effect free:
 * - no database access
 * - no network access
 * - no OpenAI calls
 *
 * It combines ticket text, category, and severity so later support-triage
 * integration can choose a safe next step without yet persisting anything.
 */

import type { SupportTicketCategory } from "@/lib/cron/support-ticket-classifier";
import type { SupportTicketSeverity } from "@/lib/cron/support-ticket-severity";

export type SupportTicketRecommendedAction =
  | "AUTO_REPLY_DRAFT"
  | "CREATE_CODING_TASK"
  | "ESCALATE_TO_ADMIN"
  | "MARK_SPAM"
  | "MONITOR";

const ADMIN_ESCALATION_PATTERNS: RegExp[] = [
  /\b(?:security|privacy|legal|refund|chargeback|billing dispute|delete my data|erase my data)\b/i,
  /\b(?:hacked|compromised|unauthorized access|abuse|harassment|threat|lawsuit)\b/i,
  /\b(?:cannot access my account|locked out|cannot sign in|can'?t sign in)\b/i,
  /\b(?:payment failed|charged twice|double charged|refund)\b/i,
];

const LOW_RISK_ACCOUNT_PATTERNS: RegExp[] = [
  /\b(?:how do i update my email|how do i change my password|question about login)\b/i,
];

const MONITOR_PATTERNS: RegExp[] = [
  /\b(?:general thought|just feedback|fyi|for your information|suggestion only)\b/i,
];

function normalize(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

export function classifySupportTicketRecommendedAction(
  text: string,
  category: SupportTicketCategory,
  severity: SupportTicketSeverity
): SupportTicketRecommendedAction {
  const normalized = normalize(text);

  if (category === "SPAM") return "MARK_SPAM";

  if (category === "BUG" && (severity === "HIGH" || severity === "CRITICAL")) {
    return "CREATE_CODING_TASK";
  }

  if (
    (category === "ACCOUNT" || category === "BILLING") &&
    !matchesAny(normalized, LOW_RISK_ACCOUNT_PATTERNS)
  ) {
    return severity === "LOW" ? "AUTO_REPLY_DRAFT" : "ESCALATE_TO_ADMIN";
  }

  if (matchesAny(normalized, ADMIN_ESCALATION_PATTERNS)) {
    return "ESCALATE_TO_ADMIN";
  }

  if (
    (category === "UX" || category === "I18N" || category === "CONTENT") &&
    (severity === "LOW" || severity === "MEDIUM")
  ) {
    return severity === "LOW" ? "AUTO_REPLY_DRAFT" : "MONITOR";
  }

  if (category === "OTHER") {
    return matchesAny(normalized, MONITOR_PATTERNS) ? "MONITOR" : "ESCALATE_TO_ADMIN";
  }

  if (severity === "CRITICAL") return "ESCALATE_TO_ADMIN";
  if (severity === "HIGH") return "MONITOR";

  return "AUTO_REPLY_DRAFT";
}
