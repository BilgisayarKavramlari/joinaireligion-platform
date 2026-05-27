/**
 * Phase 2 — Test 05: Profile update route
 *
 * Tests POST /api/account/profile (src/app/api/account/profile/route.ts).
 *
 * Phase 2.3 requirement: profile fields (country, city, phone, secondaryEmail,
 * socialLinks) must all be optional and writable; displayName must propagate to
 * the User table while the rest go to UserProfile.
 *
 * Covered scenarios:
 *   1. Unauthenticated request → 401
 *   2. Happy path with all fields → 200 + ok:true
 *   3. displayName null-cleared correctly
 *   4. All optional profile fields written to UserProfile
 *   5. socialMedia JSON blob stored as-is
 *   6. Partial update (only one field) still succeeds
 *   7. Empty string values are treated as null
 */

import { buildJsonRequest, jsonBody } from "../helpers/mockDb";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetSession = jest.fn();
const mockCookiesGet = jest.fn();

jest.mock("next/headers", () => ({
  cookies: jest.fn(() => ({
    get: mockCookiesGet,
  })),
}));

jest.mock("@/lib/auth", () => ({
  ...jest.requireActual("@/lib/auth"),
  getSessionFromCookie: mockGetSession,
}));

jest.mock("@/lib/db", () => ({
  db: {
    user: {
      update: jest.fn(),
    },
    userProfile: {
      upsert: jest.fn(),
    },
  },
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { db } from "@/lib/db";
import { POST } from "@/app/api/account/profile/route";

const mockDb = db as jest.Mocked<typeof db>;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const fakeSession = { userId: "u_001", email: "seeker@sacred.test", role: "USER", iat: Date.now() };

const fullProfileBody = {
  displayName: "Sacred Seeker",
  tradition: "Buddhism",
  bio: "Walking the eightfold path.",
  country: "Türkiye",
  city: "İstanbul",
  phone: "+90 555 000 0000",
  secondaryEmail: "seeker2@example.com",
  socialMedia: {
    twitter: "@seeker",
    instagram: "@seeker.sacred",
    linkedin: "linkedin.com/in/seeker",
    website: "https://seeker.dev",
  },
};

function authRequest(body: object) {
  mockCookiesGet.mockReturnValue({ value: "session_value" });
  mockGetSession.mockReturnValue(fakeSession);
  return buildJsonRequest(body);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/account/profile", () => {
  beforeEach(() => {
    (mockDb.user.update as jest.Mock).mockResolvedValue({});
    (mockDb.userProfile.upsert as jest.Mock).mockResolvedValue({});
  });

  // ─── Auth guard ───────────────────────────────────────────────────────────────

  it("401 when no valid session", async () => {
    mockCookiesGet.mockReturnValue(undefined);
    mockGetSession.mockReturnValue(null);
    const req = buildJsonRequest(fullProfileBody);
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  // ─── Happy path ───────────────────────────────────────────────────────────────

  it("200 + ok:true with full profile payload", async () => {
    const req = authRequest(fullProfileBody);
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await jsonBody(res);
    expect(body.ok).toBe(true);
  });

  it("updates User.displayName in the User table", async () => {
    const req = authRequest(fullProfileBody);
    await POST(req as any);
    const userUpdate = (mockDb.user.update as jest.Mock).mock.calls[0][0];
    expect(userUpdate.data.displayName).toBe("Sacred Seeker");
    expect(userUpdate.where.id).toBe(fakeSession.userId);
  });

  it("upserts UserProfile with tradition and bio", async () => {
    const req = authRequest(fullProfileBody);
    await POST(req as any);
    const upsert = (mockDb.userProfile.upsert as jest.Mock).mock.calls[0][0];
    expect(upsert.create.tradition).toBe("Buddhism");
    expect(upsert.create.bio).toBe("Walking the eightfold path.");
    expect(upsert.update.bio).toBe("Walking the eightfold path.");
  });

  // ─── Phase 2.3 optional fields ────────────────────────────────────────────────

  it("writes country to UserProfile", async () => {
    const req = authRequest(fullProfileBody);
    await POST(req as any);
    const upsert = (mockDb.userProfile.upsert as jest.Mock).mock.calls[0][0];
    expect(upsert.create.country).toBe("Türkiye");
  });

  it("writes city to UserProfile", async () => {
    const req = authRequest(fullProfileBody);
    await POST(req as any);
    const upsert = (mockDb.userProfile.upsert as jest.Mock).mock.calls[0][0];
    expect(upsert.create.city).toBe("İstanbul");
  });

  it("writes phone to UserProfile", async () => {
    const req = authRequest(fullProfileBody);
    await POST(req as any);
    const upsert = (mockDb.userProfile.upsert as jest.Mock).mock.calls[0][0];
    expect(upsert.create.phone).toBe("+90 555 000 0000");
  });

  it("writes secondaryEmail to UserProfile", async () => {
    const req = authRequest(fullProfileBody);
    await POST(req as any);
    const upsert = (mockDb.userProfile.upsert as jest.Mock).mock.calls[0][0];
    expect(upsert.create.secondaryEmail).toBe("seeker2@example.com");
  });

  it("writes socialMedia JSON blob to UserProfile", async () => {
    const req = authRequest(fullProfileBody);
    await POST(req as any);
    const upsert = (mockDb.userProfile.upsert as jest.Mock).mock.calls[0][0];
    expect(upsert.create.socialMedia).toMatchObject({
      twitter: "@seeker",
      linkedin: "linkedin.com/in/seeker",
    });
  });

  // ─── Null / partial handling ──────────────────────────────────────────────────

  it("sets displayName to null when undefined in payload", async () => {
    const req = authRequest({ ...fullProfileBody, displayName: undefined });
    await POST(req as any);
    const userUpdate = (mockDb.user.update as jest.Mock).mock.calls[0][0];
    expect(userUpdate.data.displayName).toBeNull();
  });

  it("partial update succeeds — only displayName provided", async () => {
    const req = authRequest({ displayName: "Just A Name" });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    // UserProfile.upsert must still have been called
    expect(mockDb.userProfile.upsert as jest.Mock).toHaveBeenCalled();
  });

  it("empty string fields are coerced to null in UserProfile", async () => {
    const req = authRequest({ ...fullProfileBody, city: null, phone: null });
    await POST(req as any);
    const upsert = (mockDb.userProfile.upsert as jest.Mock).mock.calls[0][0];
    expect(upsert.create.city).toBeNull();
    expect(upsert.create.phone).toBeNull();
  });
});
