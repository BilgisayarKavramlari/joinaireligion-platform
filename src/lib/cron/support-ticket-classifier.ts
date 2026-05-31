/**
 * support-ticket-classifier.ts
 *
 * Deterministic category classification for support / feedback text.
 *
 * This helper is intentionally pure and side-effect free:
 * - no database access
 * - no network access
 * - no OpenAI calls
 *
 * It exists as the smallest implementation slice for Task 3A-1a so later
 * support-triage work can reuse a stable classifier without yet persisting
 * ticket metadata or taking external actions.
 */

export type SupportTicketCategory =
  | "BUG"
  | "ACCOUNT"
  | "BILLING"
  | "CONTENT"
  | "I18N"
  | "UX"
  | "SPAM"
  | "OTHER";

const SPAM_PATTERNS: RegExp[] = [
  /^(.)\1{14,}$/i,
  /^[^a-zA-ZÀ-ɏЀ-ӿ؀-ۿ一-鿿]{15,}$/,
  /\b(?:buy now|cheap seo|crypto giveaway|free money|viagra|casino)\b/i,
  /\b(?:http|www\.)\S+\b.*\b(?:http|www\.)\S+\b/i,
];

const CATEGORY_RULES: Array<{
  category: Exclude<SupportTicketCategory, "SPAM" | "OTHER">;
  patterns: RegExp[];
}> = [
  {
    category: "BILLING",
    patterns: [
      /\b(?:billing|charged|charge|refund|invoice|payment|subscription|card declined|credit card|stripe|cancel my plan)\b/i,
    ],
  },
  {
    category: "ACCOUNT",
    patterns: [
      /\b(?:login|log in|sign in|sign-in|password|reset password|verify email|verification email|account locked|can'?t access|cannot access|access my account|delete my account)\b/i,
    ],
  },
  {
    category: "I18N",
    patterns: [
      /\b(?:translation|translate|translated|locale|language|turkish|english|spanish|german|french|arabic)\b/i,
      /\b(?:not translated|wrong language|still in english|mixed language)\b/i,
    ],
  },
  {
    category: "BUG",
    patterns: [
      /\b(?:bug|error|broken|crash|crashes|exception|stack trace|500|404|not working|doesn'?t work|failed to load)\b/i,
    ],
  },
  {
    category: "UX",
    patterns: [
      /\b(?:confusing|hard to find|unclear|layout|button|navigation|nav|too many clicks|user experience|ux|mobile view|responsive)\b/i,
    ],
  },
  {
    category: "CONTENT",
    patterns: [
      /\b(?:lesson|content|copy|text|article|reading|practice prompt|prompt|empty lesson|incorrect information|typo|spelling)\b/i,
    ],
  },
];

function normalize(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function looksLikeSpam(text: string): boolean {
  return SPAM_PATTERNS.some((pattern) => pattern.test(text));
}

export function classifySupportTicket(text: string): SupportTicketCategory {
  const normalized = normalize(text);

  if (!normalized) return "OTHER";
  if (looksLikeSpam(normalized)) return "SPAM";

  for (const rule of CATEGORY_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      return rule.category;
    }
  }

  return "OTHER";
}
