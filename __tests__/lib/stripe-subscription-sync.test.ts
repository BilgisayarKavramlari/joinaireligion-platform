const mockSubscriptionFindFirst = jest.fn();
const mockSubscriptionFindUnique = jest.fn();
const mockSubscriptionUpsert = jest.fn();
const mockLessonQuotaUpsert = jest.fn();
const mockUserFindUnique = jest.fn();
const mockTransaction = jest.fn();

jest.mock("@/lib/env", () => ({
  env: {
    STRIPE_PRICE_SEEKER_MONTHLY: "price_seeker",
    STRIPE_PRICE_INITIATE_MONTHLY: "price_initiate",
  },
}));

jest.mock("@/lib/db", () => ({
  db: {
    subscription: {
      findFirst: (...args: unknown[]) => mockSubscriptionFindFirst(...args),
      findUnique: (...args: unknown[]) => mockSubscriptionFindUnique(...args),
    },
    user: { findUnique: (...args: unknown[]) => mockUserFindUnique(...args) },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

import type Stripe from "stripe";
import { SubscriptionStatus } from "@prisma/client";
import {
  getCheckoutSessionOwnerId,
  resolveSubscriptionOwnerId,
  StripeOwnershipError,
  syncStripeSubscription,
} from "@/lib/stripe/subscription-sync";

function subscription(overrides: Partial<Stripe.Subscription> = {}): Stripe.Subscription {
  return {
    id: "sub_123",
    status: "active",
    customer: "cus_123",
    metadata: { userId: "user_123" },
    current_period_end: 1_900_000_000,
    canceled_at: null,
    items: {
      data: [{ price: { id: "price_initiate", product: "prod_123" } }],
    },
    ...overrides,
  } as Stripe.Subscription;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSubscriptionFindFirst.mockResolvedValue(null);
  mockSubscriptionFindUnique.mockResolvedValue(null);
  mockUserFindUnique.mockResolvedValue({ id: "user_123" });
  mockSubscriptionUpsert.mockResolvedValue({});
  mockLessonQuotaUpsert.mockResolvedValue({});
  mockTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
    subscription: { upsert: mockSubscriptionUpsert },
    lessonQuota: { upsert: mockLessonQuotaUpsert },
  }));
});

describe("Stripe subscription ownership", () => {
  it("requires matching Checkout metadata and client reference", () => {
    const session = { metadata: { userId: "user_a" }, client_reference_id: "user_b" } as unknown as Stripe.Checkout.Session;
    expect(() => getCheckoutSessionOwnerId(session)).toThrow(StripeOwnershipError);
  });

  it("rejects conflicting subscription and local ownership", async () => {
    mockSubscriptionFindFirst.mockResolvedValue({ userId: "user_other" });
    await expect(resolveSubscriptionOwnerId(subscription())).rejects.toThrow(StripeOwnershipError);
  });
});

describe("syncStripeSubscription", () => {
  it("activates a configured active Initiate subscription and initializes daily quota", async () => {
    const now = new Date("2026-07-29T12:00:00.000Z");
    const result = await syncStripeSubscription({ subscription: subscription(), userId: "user_123", now });

    expect(result).toEqual({ userId: "user_123", status: SubscriptionStatus.ACTIVE, plan: "initiate", active: true });
    expect(mockSubscriptionUpsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        status: SubscriptionStatus.ACTIVE,
        providerPriceId: "price_initiate",
        planCode: "initiate",
        providerStatus: "active",
      }),
      update: expect.objectContaining({
        status: SubscriptionStatus.ACTIVE,
        providerCustomerId: "cus_123",
        planCode: "initiate",
        providerStatus: "active",
      }),
    }));
    expect(mockLessonQuotaUpsert).toHaveBeenCalledWith(expect.objectContaining({
      update: expect.objectContaining({ usedAttempts: 0, lastResetAt: now }),
    }));
  });

  it("fails closed when an active Stripe subscription uses an unknown price", async () => {
    const unknownPrice = subscription({
      items: { data: [{ price: { id: "price_unknown", product: "prod_unknown" } }] } as Stripe.ApiList<Stripe.SubscriptionItem>,
    });
    const result = await syncStripeSubscription({ subscription: unknownPrice, userId: "user_123" });

    expect(result.status).toBe(SubscriptionStatus.PAST_DUE);
    expect(result.active).toBe(false);
    expect(mockLessonQuotaUpsert).not.toHaveBeenCalled();
  });

  it("does not reset an already active Initiate quota during an idempotent repeat", async () => {
    mockSubscriptionFindUnique.mockResolvedValue({ status: SubscriptionStatus.ACTIVE, providerPriceId: "price_initiate" });
    await syncStripeSubscription({ subscription: subscription(), userId: "user_123" });

    expect(mockLessonQuotaUpsert).toHaveBeenCalledWith(expect.objectContaining({ update: { maxAttempts: 1 } }));
  });
});
