/**
 * Phase 3 — Test 07: Onboarding save eagerly creates Step 1 UserLesson
 *
 * Tests POST /api/onboarding/save after the Phase 3.A change:
 *   - Fetches the Step 1 template lesson
 *   - Creates a UserLesson row immediately (not lazily on first GET /lessons)
 *   - Passes lesson stub to sendFirstLessonEmail
 *   - preferred_language extracted and applied to User.preferredLocale
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

jest.mock("@/lib/db", () => ({
  db: {
    onboardingAnswer: { createMany: jest.fn() },
    userProfile:      { upsert:     jest.fn() },
    user:             { update:     jest.fn() },
    lesson:           { findFirst:  jest.fn() },
    userLesson:       { upsert:     jest.fn() },
  },
}));

jest.mock("@/lib/email", () => ({
  sendFirstLessonEmail: jest.fn().mockResolvedValue({ ok: true }),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { db } from "@/lib/db";
import { sendFirstLessonEmail } from "@/lib/email";
import { POST } from "@/app/api/onboarding/save/route";

const mockDb = db as jest.Mocked<typeof db>;
const mockEmail = sendFirstLessonEmail as jest.MockedFunction<typeof sendFirstLessonEmail>;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const fakeSession = { userId: "u_ob_001", email: "seeker@test.com", role: "USER", iat: Date.now() };
const updatedUser  = makeUser({ onboardingDone: true });

const step1Lesson = {
  id:                  "lesson_step1_template",
  stepNumber:          1,
  isTemplate:          true,
  forUserId:           null,
  title:               "The Witness Within — Awakening Awareness",
  tradition:           null,
  readingText:         "Every wisdom tradition begins with the same invitation…",
  practiceDescription: "**Phase 1: Settling** …",
  questions:           [
    { id: "q1", text: "What did you experience?", type: "experience" },
    { id: "q2", text: "Any resistance?",           type: "reflection" },
  ],
};

const fullAnswers = {
  tradition:              "Buddhism",
  relationship:           "Curious but not yet committed",
  preferred_language:     "tr",
  draw:                   "Seeking inner peace.",
  conflict:               "Seek solitude and reflect",
  higher_power:           "A quiet universal presence.",
  practice:               "Daily meditation or contemplation",
  obstacle:               "Restlessness.",
  awakening:              "Learning to remain awake to the present moment.",
  silence:                "Somewhat comfortable",
  community:              "Nice to have occasionally",
  meaning_channel:        "Through direct silence or awareness",
  question:               "What is truly essential?",
  intent:                 "Reflection — I want to turn inward and examine my life",
  practice_style:         "Journaling — I process through writing and self-reflection",
  sensitivity_boundaries: "No boundaries — I am open to all content",
  email_cadence_consent:  "Weekly — I prefer one thoughtful practice each week",
  safety_acknowledgement: "accepted",
};

function authRequest(body: object) {
  mockCookiesGet.mockReturnValue({ value: "session_val" });
  mockGetSession.mockReturnValue(fakeSession);
  return buildJsonRequest(body);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/onboarding/save (Phase 3 — eager Step 1 creation)", () => {
  beforeEach(() => {
    (mockDb.onboardingAnswer.createMany as jest.Mock).mockResolvedValue({ count: 6 });
    (mockDb.userProfile.upsert as jest.Mock).mockResolvedValue({});
    (mockDb.user.update as jest.Mock).mockResolvedValue(updatedUser);
    (mockDb.lesson.findFirst as jest.Mock).mockResolvedValue(step1Lesson);
    (mockDb.userLesson.upsert as jest.Mock).mockResolvedValue({});
  });

  // ─── Step 1 UserLesson creation ───────────────────────────────────────────────

  it("looks up Step 1 template lesson after marking onboarding done", async () => {
    const req = authRequest({ answers: fullAnswers });
    await POST(req as any);
    expect(mockDb.lesson.findFirst as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ stepNumber: 1, isTemplate: true, forUserId: null }),
      }),
    );
  });

  it("upserts a UserLesson for Step 1 immediately (not lazily)", async () => {
    const req = authRequest({ answers: fullAnswers });
    await POST(req as any);
    expect(mockDb.userLesson.upsert as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        where:  { userId_lessonId: { userId: fakeSession.userId, lessonId: step1Lesson.id } },
        create: expect.objectContaining({ status: "PENDING" }),
        update: {},
      }),
    );
  });

  it("does NOT throw if no Step 1 lesson template exists in DB", async () => {
    (mockDb.lesson.findFirst as jest.Mock).mockResolvedValue(null);
    const req = authRequest({ answers: fullAnswers });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
  });

  // ─── Email includes lesson stub ───────────────────────────────────────────────

  it("calls sendFirstLessonEmail with the lesson stub as 4th argument", async () => {
    const req = authRequest({ answers: fullAnswers });
    await POST(req as any);
    expect(mockEmail).toHaveBeenCalledWith(
      updatedUser.email,
      fakeSession.userId,
      updatedUser.displayName,
      step1Lesson,
    );
  });

  it("passes undefined as lesson stub when no template exists", async () => {
    (mockDb.lesson.findFirst as jest.Mock).mockResolvedValue(null);
    const req = authRequest({ answers: fullAnswers });
    await POST(req as any);
    expect(mockEmail).toHaveBeenCalledWith(
      updatedUser.email,
      fakeSession.userId,
      updatedUser.displayName,
      undefined,
    );
  });

  // ─── preferred_language → User.preferredLocale ────────────────────────────────

  it("updates User.preferredLocale from preferred_language answer", async () => {
    const req = authRequest({ answers: fullAnswers });
    await POST(req as any);
    // First update call sets preferredLocale
    const allCalls = (mockDb.user.update as jest.Mock).mock.calls;
    const localeCall = allCalls.find((c: { data?: { preferredLocale?: string } }[]) =>
      c[0]?.data?.preferredLocale,
    );
    expect(localeCall).toBeDefined();
    expect(localeCall[0].data.preferredLocale).toBe("tr");
  });

  it("returns 400 when preferred_language is missing", async () => {
    const noLang = { ...fullAnswers };
    delete (noLang as Partial<typeof fullAnswers>).preferred_language;
    const req = authRequest({ answers: noLang });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  // ─── Existing Phase 2 tests still pass ───────────────────────────────────────

  it("200 + ok:true + next:/lessons on valid payload", async () => {
    const req = authRequest({ answers: fullAnswers });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await jsonBody(res);
    expect(body.ok).toBe(true);
    expect(body.next).toBe("/lessons");
  });
});
