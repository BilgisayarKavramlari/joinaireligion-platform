const mockGetCurrentUserFromRequest = jest.fn();
const mockFindUnique = jest.fn();

jest.mock("@/lib/auth", () => ({
  getCurrentUserFromRequest: (...args: unknown[]) => mockGetCurrentUserFromRequest(...args),
}));

jest.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: (...args: unknown[]) => mockFindUnique(...args) },
  },
}));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/auth/me/route";

function request() {
  return new NextRequest("http://localhost/api/auth/me");
}

const storedUser = {
  id: "user_1",
  email: "seeker@example.com",
  displayName: "Seeker",
  role: "USER",
  emailVerifiedAt: new Date("2026-07-28T10:00:00.000Z"),
  currentLevel: 3,
  xpTotal: 640,
  daysActive: 7,
  onboardingDone: false,
  unsubscribedAt: null,
  profile: {
    bio: null,
    tradition: "Secular",
    country: null,
    city: null,
    phone: null,
    secondaryEmail: null,
    socialMedia: { website: "https://example.com" },
    avatarPath: "/uploads/avatar.webp",
  },
  subscription: {
    status: "ACTIVE",
    planCode: "initiate",
    providerPriceId: "price_initiate",
    currentPeriodEnd: new Date("2026-08-28T10:00:00.000Z"),
    trialEndsAt: null,
  },
};

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    process.env.STRIPE_PRICE_SEEKER_MONTHLY = "price_seeker";
    process.env.STRIPE_PRICE_INITIATE_MONTHLY = "price_initiate";
    mockGetCurrentUserFromRequest.mockResolvedValue({ id: storedUser.id });
    mockFindUnique.mockResolvedValue(storedUser);
  });

  it("returns 401 without querying profile data when the session is absent", async () => {
    mockGetCurrentUserFromRequest.mockResolvedValue(null);

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ user: null });
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("returns the UI auth DTO and derives onboarding and public plan fields", async () => {
    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user).toMatchObject({
      id: storedUser.id,
      email: storedUser.email,
      currentLevel: 3,
      xpTotal: 640,
      daysActive: 7,
      onboardingDone: false,
      requiresOnboarding: true,
      avatarUrl: "/uploads/avatar.webp",
      subscription: {
        status: "ACTIVE",
        plan: "initiate",
      },
    });
  });

  it("does not expose Stripe provider identifiers in the response", async () => {
    const response = await GET(request());
    const serialized = JSON.stringify(await response.json());

    expect(serialized).not.toContain("providerCustomerId");
    expect(serialized).not.toContain("providerSubscriptionId");
    expect(serialized).not.toContain("providerPriceId");
    expect(serialized).not.toContain("price_initiate");
  });

  it("fails closed to an unknown public plan when the stored price is unmapped", async () => {
    mockFindUnique.mockResolvedValue({
      ...storedUser,
      subscription: { ...storedUser.subscription, planCode: null, providerPriceId: "price_unknown" },
    });

    const response = await GET(request());
    const body = await response.json();

    expect(body.user.subscription.plan).toBeNull();
  });
});
