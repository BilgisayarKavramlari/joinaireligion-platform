const mockGetCurrentUser = jest.fn();
const mockCreateSession = jest.fn();

jest.mock("@/lib/auth", () => ({
  getCurrentUserFromRequest: (...args: unknown[]) => mockGetCurrentUser(...args),
}));

jest.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "https://joinaireligion.com",
    STRIPE_PRICE_SEEKER_MONTHLY: "price_seeker",
    STRIPE_PRICE_INITIATE_MONTHLY: "price_initiate",
  },
}));

jest.mock("@/lib/rate-limit", () => ({
  checkRateLimit: jest.fn(() => ({ allowed: true, retryAfter: 0 })),
  getClientIp: jest.fn(() => "127.0.0.1"),
  rateLimitResponse: jest.fn(),
}));

jest.mock("@/lib/stripe", () => ({
  getPriceIdForPlan: jest.fn((plan: string) => `price_${plan}`),
  getStripeClient: jest.fn(() => ({ checkout: { sessions: { create: mockCreateSession } } })),
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/stripe/create-checkout-session/route";

function request(body: unknown) {
  return new NextRequest("https://joinaireligion.com/api/stripe/create-checkout-session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCurrentUser.mockResolvedValue({
    id: "user_123",
    email: "owner@example.com",
    subscription: null,
  });
  mockCreateSession.mockResolvedValue({ id: "cs_test_12345678", url: "https://checkout.stripe.com/test" });
});

describe("subscription Checkout creation", () => {
  it("passes explicit TRY currency, owner metadata and a reconcilable success URL", async () => {
    const response = await POST(request({ plan: "initiate", currency: "try" }));

    expect(response.status).toBe(200);
    expect(mockCreateSession).toHaveBeenCalledWith(expect.objectContaining({
      mode: "subscription",
      currency: "try",
      customer_email: "owner@example.com",
      client_reference_id: "user_123",
      metadata: { plan: "initiate", userId: "user_123", currency: "try" },
      subscription_data: { metadata: { plan: "initiate", userId: "user_123", currency: "try" } },
      success_url: "https://joinaireligion.com/pricing?status=success&session_id={CHECKOUT_SESSION_ID}",
    }));
  });

  it("reuses the known Stripe customer", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "user_123",
      email: "owner@example.com",
      subscription: { status: "CANCELED", providerCustomerId: "cus_123" },
    });
    await POST(request({ plan: "seeker", currency: "usd" }));

    expect(mockCreateSession).toHaveBeenCalledWith(expect.objectContaining({ customer: "cus_123" }));
    expect(mockCreateSession.mock.calls[0][0]).not.toHaveProperty("customer_email");
  });

  it("blocks duplicate Checkout for an active subscription", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "user_123",
      email: "owner@example.com",
      subscription: { status: "ACTIVE", providerCustomerId: "cus_123" },
    });
    const response = await POST(request({ plan: "initiate", currency: "usd" }));

    expect(response.status).toBe(409);
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it("rejects unsupported currency instead of silently falling back", async () => {
    const response = await POST(request({ plan: "initiate", currency: "eur" }));
    expect(response.status).toBe(400);
    expect(mockCreateSession).not.toHaveBeenCalled();
  });
});

