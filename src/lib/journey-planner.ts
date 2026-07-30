import type { PersonalActivityType, PersonalPlanStatus } from "@prisma/client";

export const PERSONAL_ACTIVITY_TYPES = [
  "MEDITATION", "YOGA", "READING", "LESSON",
  "PRACTICE", "JOURNAL", "REFLECTION", "OTHER",
] as const satisfies readonly PersonalActivityType[];

export const PERSONAL_PLAN_STATUSES = [
  "PLANNED", "COMPLETED", "SKIPPED", "CANCELLED",
] as const satisfies readonly PersonalPlanStatus[];

export type PersonalPlanPayload = { title: string; details: string };
export type PrivateNotePayload = { title: string; body: string; tags: string[] };

export function boundedText(value: unknown, max: number, required = false): string {
  if (typeof value !== "string") {
    if (required) throw new Error("VALIDATION_ERROR");
    return "";
  }
  const normalized = value.trim();
  if ((required && !normalized) || normalized.length > max) throw new Error("VALIDATION_ERROR");
  return normalized;
}

export function parseActivityType(value: unknown): PersonalActivityType {
  if (typeof value !== "string" || !(PERSONAL_ACTIVITY_TYPES as readonly string[]).includes(value)) {
    throw new Error("VALIDATION_ERROR");
  }
  return value as PersonalActivityType;
}

export function parsePlanStatus(value: unknown): PersonalPlanStatus {
  if (typeof value !== "string" || !(PERSONAL_PLAN_STATUSES as readonly string[]).includes(value)) {
    throw new Error("VALIDATION_ERROR");
  }
  return value as PersonalPlanStatus;
}

export function parseDate(value: unknown): Date {
  if (typeof value !== "string") throw new Error("VALIDATION_ERROR");
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("VALIDATION_ERROR");
  return date;
}

export function parseDuration(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 1_440) throw new Error("VALIDATION_ERROR");
  return parsed;
}

export function parseTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  if (value.length > 10) throw new Error("VALIDATION_ERROR");
  return [...new Set(value.map((tag) => boundedText(tag, 30)).filter(Boolean))];
}

export function expiryFromRetentionDays(value: unknown, now = new Date()): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const days = Number(value);
  if (![30, 90, 365].includes(days)) throw new Error("VALIDATION_ERROR");
  return new Date(now.getTime() + days * 86_400_000);
}

export function isValidationError(error: unknown) {
  return error instanceof Error && error.message === "VALIDATION_ERROR";
}
