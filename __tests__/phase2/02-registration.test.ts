/**
 * Phase 2 — Test 02: Registration route handler
 *
 * Tests POST /api/auth/register (src/app/api/auth/register/route.ts).
 *
 * Strategy:
 *   - Mock @/lib/db (Prisma client) via jest.mock
 *   - Mock @/lib/email (sendVerificationEmail) to avoid real HTTP calls
 *   - Call the exported POST handler directly with fabricated Request objects
 *   - Assert status codes and JSON response shapes
 *
 * Covered scenarios:
 *   1. Missing / invalid email → 400
 *   2. Password too short → 400
 *   3. Terms not accepted → 400
 *   4. Duplicate email → 409
 *   5. Happy path → 200, ok:true, verification email queued
 *   6. Journey defaults initialised on created user (level=1, xp=0, daysActive=0)
 */

import { buildJsonRequest, jsonBody } from "../helpers/mockDb";

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    emailVerificationToken: {
      create: jest.fn(),
    },
  },
}));

jest.mock("@/lib/email", () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue({ success: true }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { POST } from "@/app/api/auth/register/route";

const mockDb = db as jest.Mocked<typeof db>;
const mockEmail = sendVerificationEmail as jest.MockedFunction<typeof sendVerificationEmail>;

const validBody = {
  email: "seeker@sacred.test",
  password: "Seeker123456",
  displayName: "Sacred Seeker",
  acceptedTerms: true,
  emailOptIn: false,
};

const createdUser = {
  id: "user_abc",
  email: "seeker@sacred.test",
  displayName: "Sacred Seeker",
  currentLevel: 1,
  xpTotal: 0,
  daysActive: 0,
  onboardingDone: false,
  role: "USER",
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    (mockDb.user.findUnique as jest.Mock).mockResolvedValue(null); // no duplicate by default
    (mockDb.user.create as jest.Mock).mockResolvedValue(createdUser);
    (mockDb.emailVerificationToken.create as jest.Mock).mockResolvedValue({});
  });

  // ─── Validation ──────────────────────────────────────────────────────────────

  it("400 when email is missing", async () => {
    const req = buildJsonRequest({ ...validBody, email: "" });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await jsonBody(res);
    expect(body.error).toMatch(/email/i);
  });

  it("400 when email format is invalid", async () => {
    const req = buildJsonRequest({ ...validBody, email: "not-an-email" });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await jsonBody(res);
    expect(body.error).toMatch(/email/i);
  });

  it("400 when password is fewer than 8 characters", async () => {
    const req = buildJsonRequest({ ...validBody, password: "abc" });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await jsonBody(res);
    expect(body.error).toMatch(/password/i);
  });

  it("400 when acceptedTerms is false", async () => {
    const req = buildJsonRequest({ ...validBody, acceptedTerms: false });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await jsonBody(res);
    expect(body.error).toMatch(/terms/i);
  });

  // ─── Duplicate email ──────────────────────────────────────────────────────────

  it("409 when email already exists in the database", async () => {
    (mockDb.user.findUnique as jest.Mock).mockResolvedValue({ id: "existing" });
    const req = buildJsonRequest(validBody);
    const res = await POST(req as any);
    expect(res.status).toBe(409);
    const body = await jsonBody(res);
    expect(body.error).toMatch(/already exists/i);
  });

  // ─── Happy path ───────────────────────────────────────────────────────────────

  it("200 + ok:true on valid registration", async () => {
    const req = buildJsonRequest(validBody);
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await jsonBody(res);
    expect(body.ok).toBe(true);
  });

  it("creates user with journey defaults: level=1, xp=0, daysActive=0", async () => {
    const req = buildJsonRequest(validBody);
    await POST(req as any);
    const createCall = (mockDb.user.create as jest.Mock).mock.calls[0][0];
    expect(createCall.data.currentLevel).toBe(1);
    expect(createCall.data.xpTotal).toBe(0);
    expect(createCall.data.daysActive).toBe(0);
    expect(createCall.data.onboardingDone).toBe(false);
  });

  it("response body contains redirect to check-email page", async () => {
    const req = buildJsonRequest(validBody);
    const res = await POST(req as any);
    const body = await jsonBody(res);
    expect(String(body.next)).toContain("check-email");
  });

  it("calls sendVerificationEmail with the registered email address", async () => {
    const req = buildJsonRequest(validBody);
    await POST(req as any);
    expect(mockEmail).toHaveBeenCalledWith(
      validBody.email,
      expect.any(String),
      createdUser.id,
    );
  });

  it("creates a nested UserProfile record alongside the user", async () => {
    const req = buildJsonRequest(validBody);
    await POST(req as any);
    const createCall = (mockDb.user.create as jest.Mock).mock.calls[0][0];
    expect(createCall.data.profile?.create).toBeDefined();
  });

  it("creates initial JourneyLevel record labelled 'Seeker'", async () => {
    const req = buildJsonRequest(validBody);
    await POST(req as any);
    const createCall = (mockDb.user.create as jest.Mock).mock.calls[0][0];
    expect(createCall.data.journeyLevels?.create?.label).toBe("Seeker");
    expect(createCall.data.journeyLevels?.create?.level).toBe(1);
  });
});
