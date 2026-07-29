jest.mock("@/lib/env", () => ({
  env: {
    STRIPE_PRICE_SEEKER_MONTHLY: "price_seeker",
    STRIPE_PRICE_INITIATE_MONTHLY: "price_initiate",
  },
}));

import { SubscriptionStatus } from "@prisma/client";
import {
  hasActiveMembership,
  mapStripeSubscriptionStatus,
  parseCheckoutCurrency,
  resolveEntitlements,
  resolveMembershipPlan,
  resolveSubscriptionPlan,
} from "@/lib/membership";

describe("membership policy", () => {
  it("accepts only the supported Checkout currencies and defaults to USD", () => {
    expect(parseCheckoutCurrency(undefined)).toBe("usd");
    expect(parseCheckoutCurrency("usd")).toBe("usd");
    expect(parseCheckoutCurrency("try")).toBe("try");
    expect(parseCheckoutCurrency("eur")).toBeNull();
    expect(parseCheckoutCurrency("TRY")).toBeNull();
  });

  it("resolves only configured membership prices", () => {
    expect(resolveMembershipPlan("price_seeker")).toBe("seeker");
    expect(resolveMembershipPlan("price_initiate")).toBe("initiate");
    expect(resolveMembershipPlan("price_unknown")).toBeNull();
  });

  it.each([
    ["active", SubscriptionStatus.ACTIVE],
    ["trialing", SubscriptionStatus.TRIAL],
    ["past_due", SubscriptionStatus.PAST_DUE],
    ["unpaid", SubscriptionStatus.PAST_DUE],
    ["incomplete", SubscriptionStatus.PAST_DUE],
    ["paused", SubscriptionStatus.PAST_DUE],
    ["canceled", SubscriptionStatus.CANCELED],
    ["incomplete_expired", SubscriptionStatus.CANCELED],
    ["future_status", SubscriptionStatus.PAST_DUE],
  ])("maps Stripe status %s without fail-open access", (providerStatus, expected) => {
    expect(mapStripeSubscriptionStatus(providerStatus)).toBe(expected);
  });

  it("recognizes only the local ACTIVE status as active", () => {
    expect(hasActiveMembership({ status: "ACTIVE" })).toBe(true);
    expect(hasActiveMembership({ status: "active" })).toBe(false);
    expect(hasActiveMembership({ status: "PAST_DUE" })).toBe(false);
  });

  it("grants expensive daily entitlements only to an ACTIVE Initiate plan", () => {
    expect(resolveEntitlements({ status: "ACTIVE", planCode: "initiate" })).toMatchObject({
      plan: "initiate",
      subscriptionActive: true,
      supporterBadge: true,
      dailyLessonAttempt: true,
      dailyPractice: true,
      aiDailyLimit: 50,
    });
    expect(resolveEntitlements({ status: "ACTIVE", planCode: "seeker" })).toMatchObject({
      plan: "seeker",
      subscriptionActive: true,
      supporterBadge: true,
      dailyLessonAttempt: false,
      dailyPractice: false,
      aiDailyLimit: 3,
    });
  });

  it("fails closed for an ACTIVE subscription with an unknown plan", () => {
    expect(resolveSubscriptionPlan({ status: "ACTIVE", providerPriceId: "price_unknown" })).toBeNull();
    expect(resolveEntitlements({ status: "ACTIVE", providerPriceId: "price_unknown" })).toMatchObject({
      plan: null,
      supporterBadge: false,
      dailyLessonAttempt: false,
      aiDailyLimit: 3,
    });
  });
});
