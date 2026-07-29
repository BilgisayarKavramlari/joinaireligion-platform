const mockGetCurrentUser = jest.fn();
const mockRetrieveSession = jest.fn();
const mockRetrieveSubscription = jest.fn();
const mockResolveOwner = jest.fn();
const mockSyncSubscription = jest.fn();

jest.mock("@/lib/auth", () => ({
  getCurrentUserFromRequest: (...args: unknown[]) => mockGetCurrentUser(...args),
}));

jest.mock("@/lib/env", () => ({ env: {} }));

jest.mock("@/lib/rate-limit", () => ({
  checkRateLimit: jest.fn(() => ({ allowed: true, retryAfter: 0 })),
  getClientIp: jest.fn(() => "127.0.0.1"),
  rateLimitResponse: jest.fn(),
}));

jest.mock("@/lib/stripe", () => ({
  getStripeClient: jest.fn(() => ({
    checkout: { sessions: { retrieve: mockRetrieveSession } },
    subscriptions: { retrieve: mockRetrieveSubscription },
  })),
}));

jest.mock("@/lib/stripe/subscription-sync", () => {
  class StripeOwnershipError extends Error {}
  return {
    StripeOwnershipError,
    getCheckoutSessionOwnerId: jest.fn((session: { metadata?: { userId?: string }; client_reference_id?: string }) => {
      const metadata = session.metadata?.userId;
      const reference = session.client_reference_id;
      if (metadata && reference && metadata !== reference) throw new StripeOwnershipError();
      if (!metadata && !reference) throw new StripeOwnershipError();
      return metadata || reference;
    }),
    resolveSubscriptionOwnerId: (...args: unknown[]) => mockResolveOwner(...args),
    syncStripeSubscription: (...args: unknown[]) => mockSyncSubscription(...args),
  };
});

import { NextRequest } from "next/server";
import { GET } from "@/app/api/stripe/checkout-status/route";

function request(sessionId = "cs_test_12345678") {
  return new NextRequest(`https://joinaireligion.com/api/stripe/checkout-status?session_id=${sessionId}`);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCurrentUser.mockResolvedValue({ id: "user_123", subscription: null });
  mockRetrieveSession.mockResolvedValue({
    id: "cs_test_12345678",
    mode: "subscription",
    status: "complete",
    payment_status: "paid",
    subscription: "sub_123",
    metadata: { userId: "user_123" },
    client_reference_id: "user_123",
  });
  mockRetrieveSubscription.mockResolvedValue({ id: "sub_123" });
  mockResolveOwner.mockResolvedValue("user_123");
  mockSyncSubscription.mockResolvedValue({ status: "ACTIVE", plan: "initiate", active: true });
});

describe("owner-only Checkout status", () => {
  it("reconciles the provider subscription only for the owning user", async () => {
    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockResolveOwner).toHaveBeenCalled();
    expect(mockSyncSubscription).toHaveBeenCalledWith({ subscription: { id: "sub_123" }, userId: "user_123" });
    expect(body.membership).toEqual({ status: "ACTIVE", plan: "initiate", active: true });
  });

  it("rejects a Checkout session owned by another user", async () => {
    mockRetrieveSession.mockResolvedValue({
      mode: "subscription",
      metadata: { userId: "user_other" },
      client_reference_id: "user_other",
      subscription: "sub_123",
    });
    const response = await GET(request());

    expect(response.status).toBe(403);
    expect(mockRetrieveSubscription).not.toHaveBeenCalled();
    expect(mockSyncSubscription).not.toHaveBeenCalled();
  });

  it("requires authentication", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const response = await GET(request());
    expect(response.status).toBe(401);
    expect(mockRetrieveSession).not.toHaveBeenCalled();
  });
});

