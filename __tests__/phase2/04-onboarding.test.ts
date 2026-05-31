/**
 * Phase 2 — Test 04: Onboarding save route
 *
 * Tests POST /api/onboarding/save (src/app/api/onboarding/save/route.ts).
 *
 * Phase 2.2 requirement: after first verified login the onboarding questionnaire
 * must accept answers covering belief background, expectations, practice preferences,
 * preferred language, and safety acknowledgement; store them in OnboardingAnswer;
 * and mark the user's onboardingDone=true.
 *
 * Covered scenarios:
 *   1. Unauthenticated request → 401
 *   2. Missing / invalid answers payload → 400
 *   3. Happy path — all required answer keys persisted
 *   4. tradition extracted → UserProfile.tradition updated
 *   5. safety_acknowledgement stored as "accepted"
 *   6. onboardingDone marked true on User
 *   7. First-lesson email sent (fire-and-forget, non-blocking)
 *   8. Response contains next: "/lessons"
 */

import { buildJsonRequest, jsonBody, makeUser } from "../helpers/mockDb";

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
    onboardingAnswer: {
      createMany: jest.fn(),
    },
    userProfile: {
      upsert: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
    // Phase 3.A: onboarding/save now eagerly creates Step 1 UserLesson
    lesson: {
      findFirst: jest.fn(),
    },
    userLesson: {
      upsert: jest.fn(),
    },
  },
}));

jest.mock("@/lib/email", () => ({
  sendFirstLessonEmail: jest.fn().mockResolvedValue(undefined),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { db } from "@/lib/db";
import { POST } from "@/app/api/onboarding/save/route";

const mockDb = db as jest.Mocked<typeof db>;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const fakeSession = { userId: "u_001", email: "seeker@sacred.test", role: "USER", iat: Date.now() };
const updatedUser = makeUser({ onboardingDone: true });

const completeAnswers = {
  tradition:              "Buddhism",
  relationship:           "Curious but not yet committed",
  preferred_language:     "en",
  draw:                   "I am searching for inner peace.",
  conflict:               "Seek solitude and reflect",
  higher_power:           "A universal consciousness.",
  practice:               "Daily meditation or contemplation",
  obstacle:               "Restlessness and scattered focus.",
  awakening:              "Living fully in the present moment.",
  silence:                "Somewhat comfortable",
  community:              "Nice to have occasionally",
  meaning_channel:        "Through direct silence or awareness",
  question:               "What is the nature of consciousness?",
  intent:                 "Reflection — I want to turn inward and examine my life",
  practice_style:         "Journaling — I process through writing and self-reflection",
  sensitivity_boundaries: "No boundaries — I am open to all content",
  email_cadence_consent:  "Weekly — I prefer one thoughtful practice each week",
  safety_acknowledgement: "accepted",
};

// ── Helper: build authenticated request ───────────────────────────────────────

function authRequest(body: object) {
  mockCookiesGet.mockReturnValue({ value: "fake_cookie_value" });
  mockGetSession.mockReturnValue(fakeSession);
  return buildJsonRequest(body);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/onboarding/save", () => {
  beforeEach(() => {
    (mockDb.onboardingAnswer.createMany as jest.Mock).mockResolvedValue({ count: 14 });
    (mockDb.userProfile.upsert as jest.Mock).mockResolvedValue({});
    (mockDb.user.update as jest.Mock).mockResolvedValue(updatedUser);
    // Phase 3.A additions — no Step 1 lesson by default (graceful path)
    (mockDb.lesson.findFirst as jest.Mock).mockResolvedValue(null);
    (mockDb.userLesson.upsert as jest.Mock).mockResolvedValue({});
  });

  // ─── Auth guard ───────────────────────────────────────────────────────────────

  it("401 when no session cookie is present", async () => {
    mockCookiesGet.mockReturnValue(undefined);
    mockGetSession.mockReturnValue(null);
    const req = buildJsonRequest({ answers: completeAnswers });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  // ─── Payload validation ───────────────────────────────────────────────────────

  it("400 when answers field is missing from request body", async () => {
    const req = authRequest({});
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it("400 when answers is not an object (e.g. a string)", async () => {
    const req = authRequest({ answers: "not-an-object" });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  // ─── Happy path ───────────────────────────────────────────────────────────────

  it("200 + ok:true when session is valid and answers payload is complete", async () => {
    const req = authRequest({ answers: completeAnswers });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await jsonBody(res);
    expect(body.ok).toBe(true);
  });

  it("persists all answer rows via OnboardingAnswer.createMany", async () => {
    const req = authRequest({ answers: completeAnswers });
    await POST(req as any);
    expect(mockDb.onboardingAnswer.createMany as jest.Mock).toHaveBeenCalled();
    const call = (mockDb.onboardingAnswer.createMany as jest.Mock).mock.calls[0][0];
    expect(call.data.length).toBeGreaterThan(0);
    expect(call.skipDuplicates).toBe(true);
  });

  it("stored rows include the required Phase 2 question keys", async () => {
    const req = authRequest({ answers: completeAnswers });
    await POST(req as any);
    const call = (mockDb.onboardingAnswer.createMany as jest.Mock).mock.calls[0][0];
    const keys: string[] = call.data.map((r: { questionKey: string }) => r.questionKey);
    expect(keys).toContain("tradition");
    expect(keys).toContain("preferred_language");
    expect(keys).toContain("practice");
    expect(keys).toContain("draw"); // expectations / what draws you
    expect(keys).toContain("safety_acknowledgement");
  });

  it("extracts tradition answer and upserts it to UserProfile.tradition", async () => {
    const req = authRequest({ answers: completeAnswers });
    await POST(req as any);
    const upsertCall = (mockDb.userProfile.upsert as jest.Mock).mock.calls[0][0];
    expect(upsertCall.update.tradition).toBe("Buddhism");
    expect(upsertCall.create.tradition).toBe("Buddhism");
  });

  it("marks onboardingDone=true on the user record", async () => {
    const req = authRequest({ answers: completeAnswers });
    await POST(req as any);
    // Route may call user.update more than once (e.g., locale update before onboarding done)
    const allCalls = (mockDb.user.update as jest.Mock).mock.calls;
    const onboardingCall = allCalls.find(
      (c: { data?: { onboardingDone?: boolean } }[]) => c[0]?.data?.onboardingDone !== undefined,
    );
    expect(onboardingCall).toBeDefined();
    expect(onboardingCall![0].data.onboardingDone).toBe(true);
    expect(onboardingCall![0].data.onboardingDoneAt).toBeInstanceOf(Date);
  });

  it("safety_acknowledgement is stored with value 'accepted' when checked", async () => {
    const req = authRequest({ answers: completeAnswers });
    await POST(req as any);
    const call = (mockDb.onboardingAnswer.createMany as jest.Mock).mock.calls[0][0];
    const safetyRow = call.data.find(
      (r: { questionKey: string; answer: string }) => r.questionKey === "safety_acknowledgement",
    );
    expect(safetyRow).toBeDefined();
    expect(safetyRow.answer).toBe("accepted");
  });

  it("response.next is '/lessons' so the router redirects to the lesson page", async () => {
    const req = authRequest({ answers: completeAnswers });
    const res = await POST(req as any);
    const body = await jsonBody(res);
    expect(body.next).toBe("/lessons");
  });
});
