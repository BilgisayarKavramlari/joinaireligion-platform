import { SubscriptionStatus } from "@prisma/client";

import { env } from "@/lib/env";

export type MembershipPlan = "seeker" | "initiate";
export type CheckoutCurrency = "auto" | "usd" | "try";

export type MembershipLike = {
  status?: string | null;
  planCode?: string | null;
  providerPriceId?: string | null;
} | null | undefined;

export type MembershipEntitlements = {
  plan: MembershipPlan | null;
  subscriptionActive: boolean;
  supporterBadge: boolean;
  dailyLessonAttempt: boolean;
  dailyPractice: boolean;
  aiDailyLimit: number;
  reflectionDailySessions: number;
  reflectionTurnsPerSession: number;
  reflectionLifeMode: boolean;
};

export function parseCheckoutCurrency(value: unknown): CheckoutCurrency | null {
  if (value === undefined || value === null || value === "") return "auto";
  return value === "auto" || value === "usd" || value === "try" ? value : null;
}

export function resolveMembershipPlan(priceId: string | null | undefined): MembershipPlan | null {
  if (!priceId) return null;
  if (env.STRIPE_PRICE_SEEKER_MONTHLY && priceId === env.STRIPE_PRICE_SEEKER_MONTHLY) return "seeker";
  if (env.STRIPE_PRICE_INITIATE_MONTHLY && priceId === env.STRIPE_PRICE_INITIATE_MONTHLY) return "initiate";
  return null;
}

/**
 * Translate Stripe's richer lifecycle into the smaller local enum. Unknown or
 * non-entitled provider states must never grant paid access.
 */
export function mapStripeSubscriptionStatus(status: string): SubscriptionStatus {
  switch (status) {
    case "active":
      return SubscriptionStatus.ACTIVE;
    case "trialing":
      return SubscriptionStatus.TRIAL;
    case "canceled":
    case "incomplete_expired":
      return SubscriptionStatus.CANCELED;
    case "past_due":
    case "unpaid":
    case "incomplete":
    case "paused":
    default:
      return SubscriptionStatus.PAST_DUE;
  }
}

export function hasActiveMembership(subscription: { status?: string | null } | null | undefined): boolean {
  return subscription?.status === SubscriptionStatus.ACTIVE;
}

export function resolveSubscriptionPlan(subscription: MembershipLike): MembershipPlan | null {
  if (subscription?.planCode === "seeker" || subscription?.planCode === "initiate") return subscription.planCode;
  return resolveMembershipPlan(subscription?.providerPriceId);
}

/**
 * Product capabilities are deliberately plan-specific. Seeker is a supporter
 * subscription; only Initiate unlocks the higher-cost daily learning features.
 */
export function resolveEntitlements(subscription: MembershipLike): MembershipEntitlements {
  const subscriptionActive = hasActiveMembership(subscription);
  const plan = subscriptionActive ? resolveSubscriptionPlan(subscription) : null;
  const initiate = subscriptionActive && plan === "initiate";
  return {
    plan,
    subscriptionActive,
    supporterBadge: subscriptionActive && (plan === "seeker" || plan === "initiate"),
    dailyLessonAttempt: initiate,
    dailyPractice: initiate,
    aiDailyLimit: initiate ? 24 : 3,
    reflectionDailySessions: initiate ? 3 : 1,
    reflectionTurnsPerSession: initiate ? 8 : 3,
    reflectionLifeMode: initiate,
  };
}
