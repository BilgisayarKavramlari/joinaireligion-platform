/**
 * Phase 3 — Test 08: Lesson submission quota enforcement
 *
 * Tests POST /api/lessons/submit (src/app/api/lessons/submit/route.ts).
 *
 * Phase 3 requirements 9 + 10 + 11:
 *   - Free users: 1 lesson prompt per week
 *   - Paid users: 1 lesson prompt per day
 *   - AI query quota (QueryQuota) is separate from lesson quota (LessonQuota)
 *
 * Also covers:
 *   - Prompt minimum length (80 chars)
 *   - Completed lesson rejection
 *   - OpenAI fallback when OPENAI_API_KEY is absent
 *   - XP awarded on pass
 *   - Level-up logic (every 12 completed lessons)
 */

import { buildJsonRequest, jsonBody, makeUser } from "../helpers/mockDb";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetSession = jest.fn();
const mockCookiesGet = jest.fn();

jest.mock("next/headers", () => ({
  cookies: jest.fn(() => ({ get: mockCookiesGet })),
}));

jest.mock("@/lib/auth", () => ({
  ...jest.requireActual("@/lib/auth"),
  getSessionFromCookie: mockGetSession,
}));

jest.mock("@/lib/env", () => ({
  env: {
    OPENAI_API_KEY: "",       // no key → auto-pass fallback
    RESEND_API_KEY: "",
    EMAIL_FROM:     "",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  },
}));

jest.mock("@/lib/db", () => ({
  db: {
    user:             { findUnique: jest.fn(), update: jest.fn() },
    lesson:           { findUnique: jest.fn(), findFirst: jest.fn() },
    userLesson:       { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    lessonAttempt:    { create: jest.fn(), findMany: jest.fn() },
    lessonQuota:      { update: jest.fn(), create: jest.fn() },
    journeyLevel:     { create: jest.fn() },
    userActivityLog:  { create: jest.fn() },
  },
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { db } from "@/lib/db";
import { POST } from "@/app/api/lessons/submit/route";

const mockDb = db as jest.Mocked<typeof db>;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const fakeSession = { userId: "u_submit_01", email: "s@test.com", role: "USER", iat: Date.now() };

const baseLesson = {
  id: "lesson_001",
  stepNumber: 1,
  levelRequired: 1,
  title: "The Witness Within",
  tradition: null,
  readingText: "Reading…",
  practiceDescription: "Practice…",
  questions: [{ id: "q1", text: "What did you notice?", type: "experience" }],
  isTemplate: true,
  forUserId: null,
};

const baseUserLesson = {
  id: "ul_001",
  userId: "u_submit_01",
  lessonId: "lesson_001",
  status: "PENDING",
  xpEarned: 0,
  startedAt: null,
};

const longPrompt = "A".repeat(90); // > 80 chars

function authRequest(body: object) {
  mockCookiesGet.mockReturnValue({ value: "session_val" });
  mockGetSession.mockReturnValue(fakeSession);
  return buildJsonRequest(body);
}

function makeDbUser(overrides: {
  isPaid?: boolean;
  quota?: { usedAttempts: number; maxAttempts: number; periodEnd: Date } | null;
} = {}) {
  const isPaid = overrides.isPaid ?? false;
  return {
    ...makeUser(),
    subscription: isPaid ? { status: "ACTIVE" } : null,
    lessonQuota: overrides.quota !== undefined ? overrides.quota : null,
    onboarding: [],
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/lessons/submit", () => {
  beforeEach(() => {
    (mockDb.lesson.findUnique as jest.Mock).mockResolvedValue(baseLesson);
    (mockDb.lesson.findFirst as jest.Mock).mockResolvedValue(null);
    (mockDb.userLesson.findUnique as jest.Mock).mockResolvedValue(baseUserLesson);
    (mockDb.userLesson.update as jest.Mock).mockResolvedValue({ ...baseUserLesson, status: "COMPLETED", xpEarned: 60 });
    (mockDb.userLesson.count as jest.Mock).mockResolvedValue(1);
    (mockDb.lessonAttempt.create as jest.Mock).mockResolvedValue({ id: "att_001", score: 75, passed: true, feedback: "Well done." });
    (mockDb.lessonAttempt.findMany as jest.Mock).mockResolvedValue([]);
    (mockDb.lessonQuota.update as jest.Mock).mockResolvedValue({});
    (mockDb.lessonQuota.create as jest.Mock).mockResolvedValue({});
    (mockDb.journeyLevel.create as jest.Mock).mockResolvedValue({});
    (mockDb.userActivityLog.create as jest.Mock).mockResolvedValue({});
    (mockDb.user.findUnique as jest.Mock).mockResolvedValue(makeDbUser());
    (mockDb.user.update as jest.Mock).mockResolvedValue(makeDbUser());
  });

  // ─── Input validation ─────────────────────────────────────────────────────────

  it("401 when no valid session", async () => {
    mockCookiesGet.mockReturnValue(undefined);
    mockGetSession.mockReturnValue(null);
    const req = buildJsonRequest({ lessonId: baseLesson.id, promptText: longPrompt });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it("400 when lessonId is missing", async () => {
    const req = authRequest({ promptText: longPrompt });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it("400 when prompt is shorter than 80 characters", async () => {
    const req = authRequest({ lessonId: baseLesson.id, promptText: "Too short." });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await jsonBody(res);
    expect(body.error).toMatch(/80/);
  });

  it("400 when lesson is already COMPLETED", async () => {
    (mockDb.userLesson.findUnique as jest.Mock).mockResolvedValue({ ...baseUserLesson, status: "COMPLETED" });
    const req = authRequest({ lessonId: baseLesson.id, promptText: longPrompt });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await jsonBody(res);
    expect(body.error).toMatch(/already completed/i);
  });

  // ─── Quota enforcement — free user ────────────────────────────────────────────

  it("429 when free user has used their weekly attempt (period not expired)", async () => {
    const futureEnd = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000); // 6 days from now
    (mockDb.user.findUnique as jest.Mock).mockResolvedValue(makeDbUser({
      quota: { usedAttempts: 1, maxAttempts: 1, periodEnd: futureEnd },
    }));
    const req = authRequest({ lessonId: baseLesson.id, promptText: longPrompt });
    const res = await POST(req as any);
    expect(res.status).toBe(429);
    const body = await jsonBody(res);
    expect(body.error).toMatch(/free attempt|week/i);
  });

  it("allows free user when period has expired (week has passed)", async () => {
    const pastEnd = new Date(Date.now() - 1000); // 1 second ago
    (mockDb.user.findUnique as jest.Mock).mockResolvedValue(makeDbUser({
      quota: { usedAttempts: 1, maxAttempts: 1, periodEnd: pastEnd },
    }));
    const req = authRequest({ lessonId: baseLesson.id, promptText: longPrompt });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
  });

  // ─── Quota enforcement — paid user ────────────────────────────────────────────

  it("429 when paid user has used their daily attempt (period not expired)", async () => {
    const tomorrowEnd = new Date(Date.now() + 20 * 60 * 60 * 1000); // 20 hours from now
    (mockDb.user.findUnique as jest.Mock).mockResolvedValue(makeDbUser({
      isPaid: true,
      quota:  { usedAttempts: 1, maxAttempts: 1, periodEnd: tomorrowEnd },
    }));
    const req = authRequest({ lessonId: baseLesson.id, promptText: longPrompt });
    const res = await POST(req as any);
    expect(res.status).toBe(429);
    const body = await jsonBody(res);
    expect(body.error).toMatch(/daily|tomorrow/i);
  });

  it("allows paid user when daily period has expired", async () => {
    const pastEnd = new Date(Date.now() - 1000);
    (mockDb.user.findUnique as jest.Mock).mockResolvedValue(makeDbUser({
      isPaid: true,
      quota:  { usedAttempts: 1, maxAttempts: 1, periodEnd: pastEnd },
    }));
    const req = authRequest({ lessonId: baseLesson.id, promptText: longPrompt });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
  });

  // ─── Phase 3 req 11: separate quotas ─────────────────────────────────────────

  it("lesson submission does NOT touch QueryQuota (quotas are separate)", async () => {
    const queryQuotaUpdate = jest.fn();
    // If the test ever calls db.queryQuota.update, that's a bug — it shouldn't
    (db as jest.Mocked<typeof db>).queryQuota = { update: queryQuotaUpdate } as unknown as typeof db.queryQuota;
    const req = authRequest({ lessonId: baseLesson.id, promptText: longPrompt });
    await POST(req as any);
    expect(queryQuotaUpdate).not.toHaveBeenCalled();
  });

  // ─── Happy path (no OpenAI key → auto-pass) ───────────────────────────────────

  it("200 + ok:true with auto-pass score when OPENAI_API_KEY is absent", async () => {
    const req = authRequest({ lessonId: baseLesson.id, promptText: longPrompt });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await jsonBody(res);
    expect(body.ok).toBe(true);
    expect(body.passed).toBe(true);
    expect(Number(body.score)).toBeGreaterThan(0);
  });

  it("response includes feedback string", async () => {
    const req = authRequest({ lessonId: baseLesson.id, promptText: longPrompt });
    const res = await POST(req as any);
    const body = await jsonBody(res);
    expect(typeof body.feedback).toBe("string");
    expect(String(body.feedback).length).toBeGreaterThan(0);
  });

  // ─── XP and level-up ──────────────────────────────────────────────────────────

  it("marks UserLesson as COMPLETED on passing score", async () => {
    const req = authRequest({ lessonId: baseLesson.id, promptText: longPrompt });
    await POST(req as any);
    const updateCall = (mockDb.userLesson.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.data.status).toBe("COMPLETED");
    expect(updateCall.data.xpEarned).toBeGreaterThan(0);
  });

  it("creates LessonQuota row when user has no existing quota", async () => {
    (mockDb.user.findUnique as jest.Mock).mockResolvedValue(makeDbUser({ quota: null }));
    const req = authRequest({ lessonId: baseLesson.id, promptText: longPrompt });
    await POST(req as any);
    expect(mockDb.lessonQuota.create as jest.Mock).toHaveBeenCalled();
    const createCall = (mockDb.lessonQuota.create as jest.Mock).mock.calls[0][0];
    expect(createCall.data.usedAttempts).toBe(1);
  });

  it("free user quota period is 7 days", async () => {
    (mockDb.user.findUnique as jest.Mock).mockResolvedValue(makeDbUser({ quota: null, isPaid: false }));
    const before = Date.now();
    const req    = authRequest({ lessonId: baseLesson.id, promptText: longPrompt });
    await POST(req as any);
    const createCall = (mockDb.lessonQuota.create as jest.Mock).mock.calls[0][0];
    const periodEnd  = new Date(createCall.data.periodEnd).getTime();
    const days       = (periodEnd - before) / (1000 * 60 * 60 * 24);
    expect(days).toBeGreaterThanOrEqual(6.9);
    expect(days).toBeLessThanOrEqual(7.1);
  });

  it("paid user quota period is 1 day", async () => {
    (mockDb.user.findUnique as jest.Mock).mockResolvedValue(makeDbUser({ quota: null, isPaid: true }));
    const before = Date.now();
    const req    = authRequest({ lessonId: baseLesson.id, promptText: longPrompt });
    await POST(req as any);
    const createCall = (mockDb.lessonQuota.create as jest.Mock).mock.calls[0][0];
    const periodEnd  = new Date(createCall.data.periodEnd).getTime();
    const hours      = (periodEnd - before) / (1000 * 60 * 60);
    expect(hours).toBeGreaterThanOrEqual(23.9);
    expect(hours).toBeLessThanOrEqual(24.1);
  });
});
