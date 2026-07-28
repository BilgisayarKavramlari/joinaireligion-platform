/**
 * Phase 2 — Test 03: Email verification + journey state initialisation
 *
 * Tests POST /api/auth/verify-email (src/app/api/auth/verify-email/route.ts).
 *
 * This is the critical Phase 2.1 requirement: on first successful verification
 * the user record must be stamped with currentLevel=1, xpTotal=0, daysActive=0
 * and a session cookie must be set (auto-login).
 *
 * Covered scenarios:
 *   1. Missing token → 400
 *   2. Token not found in DB → 400
 *   3. Token already used (usedAt set) → 400
 *   4. Token expired → 400
 *   5. Happy path → 200, sets session cookie, onboardingDone drives redirect
 *   6. Journey fields initialised on verified user update
 *   7. UserProfile upserted so profile page never 404s
 */

import { buildJsonRequest, jsonBody, makeUser } from "../helpers/mockDb";

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock("@/lib/db", () => ({
  db: {
    emailVerificationToken: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
    userProfile: {
      upsert: jest.fn(),
    },
    session: {
      create: jest.fn(),
    },
  },
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { db } from "@/lib/db";
import { POST } from "@/app/api/auth/verify-email/route";

const mockDb = db as jest.Mocked<typeof db>;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const validToken = {
  id: "tok_001",
  email: "seeker@sacred.test",
  token: "abc123valid",
  expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
  usedAt: null,
};

const verifiedUser = makeUser({
  emailVerifiedAt: new Date(),
  currentLevel: 1,
  xpTotal: 0,
  daysActive: 0,
  onboardingDone: false,
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/auth/verify-email", () => {
  beforeEach(() => {
    (mockDb.emailVerificationToken.findUnique as jest.Mock).mockResolvedValue(validToken);
    (mockDb.emailVerificationToken.update as jest.Mock).mockResolvedValue({});
    (mockDb.user.update as jest.Mock).mockResolvedValue(verifiedUser);
    (mockDb.userProfile.upsert as jest.Mock).mockResolvedValue({});
    (mockDb.session.create as jest.Mock).mockResolvedValue({ id: "session_001" });
  });

  // ─── Input validation ─────────────────────────────────────────────────────────

  it("400 when token is missing from request body", async () => {
    const req = buildJsonRequest({});
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await jsonBody(res);
    expect(body.error).toMatch(/missing/i);
  });

  // ─── Token validation ─────────────────────────────────────────────────────────

  it("400 when token is not found in the database", async () => {
    (mockDb.emailVerificationToken.findUnique as jest.Mock).mockResolvedValue(null);
    const req = buildJsonRequest({ token: "nonexistent" });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await jsonBody(res);
    expect(body.error).toMatch(/invalid|expired/i);
  });

  it("400 when token has already been used (usedAt is set)", async () => {
    (mockDb.emailVerificationToken.findUnique as jest.Mock).mockResolvedValue({
      ...validToken,
      usedAt: new Date(),
    });
    const req = buildJsonRequest({ token: "used_token" });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it("400 when token has expired (expiresAt is in the past)", async () => {
    (mockDb.emailVerificationToken.findUnique as jest.Mock).mockResolvedValue({
      ...validToken,
      expiresAt: new Date(Date.now() - 1000), // 1 second ago
    });
    const req = buildJsonRequest({ token: "expired_token" });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  // ─── Happy path ───────────────────────────────────────────────────────────────

  it("200 + ok:true on valid, unused, non-expired token", async () => {
    const req = buildJsonRequest({ token: validToken.token });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await jsonBody(res);
    expect(body.ok).toBe(true);
  });

  it("marks the token as used before updating the user (replay-attack guard)", async () => {
    const order: string[] = [];
    (mockDb.emailVerificationToken.update as jest.Mock).mockImplementation(async () => {
      order.push("tokenUsed");
      return {};
    });
    (mockDb.user.update as jest.Mock).mockImplementation(async () => {
      order.push("userUpdated");
      return verifiedUser;
    });

    const req = buildJsonRequest({ token: validToken.token });
    await POST(req as any);
    expect(order[0]).toBe("tokenUsed");
    expect(order[1]).toBe("userUpdated");
  });

  // ─── Phase 2.1 — Journey state initialisation ─────────────────────────────────

  it("initialises currentLevel=1 on the verified user record", async () => {
    const req = buildJsonRequest({ token: validToken.token });
    await POST(req as any);
    const updateCall = (mockDb.user.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.data.currentLevel).toBe(1);
  });

  it("initialises xpTotal=0 on the verified user record", async () => {
    const req = buildJsonRequest({ token: validToken.token });
    await POST(req as any);
    const updateCall = (mockDb.user.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.data.xpTotal).toBe(0);
  });

  it("initialises daysActive=0 on the verified user record", async () => {
    const req = buildJsonRequest({ token: validToken.token });
    await POST(req as any);
    const updateCall = (mockDb.user.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.data.daysActive).toBe(0);
  });

  it("sets emailVerifiedAt timestamp on the user", async () => {
    const req = buildJsonRequest({ token: validToken.token });
    await POST(req as any);
    const updateCall = (mockDb.user.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.data.emailVerifiedAt).toBeInstanceOf(Date);
  });

  // ─── UserProfile upsert ───────────────────────────────────────────────────────

  it("upserts a UserProfile so the profile page never 404s on first visit", async () => {
    const req = buildJsonRequest({ token: validToken.token });
    await POST(req as any);
    expect(mockDb.userProfile.upsert as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: verifiedUser.id },
        create: { userId: verifiedUser.id },
      }),
    );
  });

  // ─── Auto-login cookie ────────────────────────────────────────────────────────

  it("sets the hardened session cookie in the response (auto-login)", async () => {
    const req = buildJsonRequest({ token: validToken.token });
    const res = await POST(req as any);
    const setCookie = res.headers.get("set-cookie") || "";
    expect(setCookie).toContain("__Host-jair_session=");
  });

  // ─── Redirect routing ─────────────────────────────────────────────────────────

  it("response.next points to /onboarding when onboardingDone=false", async () => {
    (mockDb.user.update as jest.Mock).mockResolvedValue({ ...verifiedUser, onboardingDone: false });
    const req = buildJsonRequest({ token: validToken.token });
    const res = await POST(req as any);
    const body = await jsonBody(res);
    expect(body.next).toBe("/onboarding");
  });

  it("response.next points to /account when onboardingDone=true", async () => {
    (mockDb.user.update as jest.Mock).mockResolvedValue({ ...verifiedUser, onboardingDone: true });
    const req = buildJsonRequest({ token: validToken.token });
    const res = await POST(req as any);
    const body = await jsonBody(res);
    expect(body.next).toBe("/account");
  });
});
