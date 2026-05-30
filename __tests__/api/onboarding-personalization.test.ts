/**
 * Tests for onboarding personalization persistence.
 *
 * Covers:
 *   1. All 7 required personalization answer keys are accepted and persisted
 *   2. intent is extracted and denormalized to UserProfile.intent
 *   3. email_cadence_consent maps to emailOptIn correctly
 *   4. practice_style and sensitivity_boundaries are stored as OnboardingAnswer rows
 *   5. Unauthorized requests are rejected (401)
 *   6. Missing answers object returns 400
 *   7. Idempotent: re-submitting same keys uses skipDuplicates
 *   8. preferred_language is written to User.preferredLocale
 *   9. tradition is written to UserProfile.tradition
 *  10. buildUserContext extracts practiceStyle and sensitivityBoundaries from onboarding
 */

// ─── Explicit mock implementations ───────────────────────────────────────────

const mockCreateMany = jest.fn();
const mockUpsert     = jest.fn();
const mockUpdate     = jest.fn();
const mockFindFirst  = jest.fn();

jest.mock("@/lib/db", () => ({
  db: {
    onboardingAnswer: { createMany: mockCreateMany },
    userProfile:      { upsert: mockUpsert },
    user:             { update: mockUpdate },
    lesson:           { findFirst: mockFindFirst },
  },
}));

jest.mock("@/lib/email", () => ({
  sendFirstLessonEmail: jest.fn().mockResolvedValue(undefined),
}));

const mockCookiesGet = jest.fn();
jest.mock("next/headers", () => ({
  cookies: jest.fn(() => ({ get: mockCookiesGet })),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

import { POST } from "@/app/api/onboarding/save/route";
import { buildJsonRequest, jsonBody } from "../helpers/mockDb";

function sessionCookie() {
  const payload = { userId: "u1", email: "a@b.com", role: "USER", iat: Date.now() };
  return { value: Buffer.from(JSON.stringify(payload)).toString("base64") };
}

function setupMocks() {
  mockCookiesGet.mockImplementation((name: string) =>
    name === "jair_session" ? sessionCookie() : undefined
  );
  mockCreateMany.mockResolvedValue({ count: 8 });
  mockUpsert.mockResolvedValue({ id: "profile1", userId: "u1" });
  mockUpdate.mockResolvedValue({
    id: "u1",
    email: "a@b.com",
    emailOptIn: true,
    preferredLocale: "en",
    onboardingDone: true,
    onboardingDoneAt: new Date(),
    displayName: "Seeker",
  });
  mockFindFirst.mockResolvedValue(null);
}

const FULL_ANSWERS = {
  tradition:               "Buddhism",
  relationship:            "Curious but not yet committed",
  preferred_language:      "en",
  intent:                  "Reflection — I want to turn inward and examine my life",
  practice_style:          "Journaling — I process through writing and self-reflection",
  sensitivity_boundaries:  "No boundaries — I am open to all content",
  email_cadence_consent:   "Weekly — I prefer one thoughtful practice each week",
  safety_acknowledgement:  "accepted",
};

// ─── Test suite ───────────────────────────────────────────────────────────────

describe("POST /api/onboarding/save — personalization persistence", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  it("returns 401 without a session cookie", async () => {
    mockCookiesGet.mockReturnValue(undefined); // no cookie
    const req = buildJsonRequest({ answers: FULL_ANSWERS });
    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });

  it("returns 400 when answers property is missing", async () => {
    const req = buildJsonRequest({});
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("returns 400 when answers is not an object", async () => {
    const req = buildJsonRequest({ answers: "bad" });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("persists all non-empty answer keys as OnboardingAnswer rows", async () => {
    const req = buildJsonRequest({ answers: FULL_ANSWERS });
    const res = await POST(req as never);

    expect(res.status).toBe(200);
    expect(mockCreateMany).toHaveBeenCalledTimes(1);

    const { data } = mockCreateMany.mock.calls[0][0] as { data: { questionKey: string }[] };
    const keys = data.map((row) => row.questionKey);

    expect(keys).toContain("intent");
    expect(keys).toContain("practice_style");
    expect(keys).toContain("sensitivity_boundaries");
    expect(keys).toContain("email_cadence_consent");
    expect(keys).toContain("tradition");
    expect(keys).toContain("preferred_language");
    expect(keys).toContain("safety_acknowledgement");
  });

  it("denormalizes intent to UserProfile.intent (short label before ' — ')", async () => {
    const req = buildJsonRequest({ answers: FULL_ANSWERS });
    await POST(req as never);

    const call = mockUpsert.mock.calls[0][0] as { update: { intent?: string }; create: { intent?: string } };
    expect(call.update.intent).toBe("Reflection");
    expect(call.create.intent).toBe("Reflection");
  });

  it("denormalizes tradition to UserProfile.tradition", async () => {
    const req = buildJsonRequest({ answers: FULL_ANSWERS });
    await POST(req as never);

    const call = mockUpsert.mock.calls[0][0] as { update: { tradition?: string }; create: { tradition?: string } };
    expect(call.update.tradition).toBe("Buddhism");
    expect(call.create.tradition).toBe("Buddhism");
  });

  it("maps Weekly cadence → emailOptIn: true", async () => {
    const req = buildJsonRequest({ answers: FULL_ANSWERS }); // "Weekly..."
    await POST(req as never);

    const call = mockUpdate.mock.calls[0][0] as { data: { emailOptIn?: boolean } };
    expect(call.data.emailOptIn).toBe(true);
  });

  it("maps Daily cadence → emailOptIn: true", async () => {
    const req = buildJsonRequest({
      answers: { ...FULL_ANSWERS, email_cadence_consent: "Daily — I want a practice every morning" },
    });
    await POST(req as never);

    const call = mockUpdate.mock.calls[0][0] as { data: { emailOptIn?: boolean } };
    expect(call.data.emailOptIn).toBe(true);
  });

  it("maps 'prefer not to receive email' → emailOptIn: false", async () => {
    const req = buildJsonRequest({
      answers: {
        ...FULL_ANSWERS,
        email_cadence_consent: "I prefer not to receive email practices (I will log in directly)",
      },
    });
    await POST(req as never);

    const call = mockUpdate.mock.calls[0][0] as { data: { emailOptIn?: boolean } };
    expect(call.data.emailOptIn).toBe(false);
  });

  it("writes preferredLocale to User when preferred_language is set", async () => {
    const req = buildJsonRequest({ answers: { ...FULL_ANSWERS, preferred_language: "tr" } });
    await POST(req as never);

    const call = mockUpdate.mock.calls[0][0] as { data: { preferredLocale?: string } };
    expect(call.data.preferredLocale).toBe("tr");
  });

  it("marks onboardingDone: true after saving", async () => {
    const req = buildJsonRequest({ answers: FULL_ANSWERS });
    await POST(req as never);

    // Two user.update calls: [0] = personalization fields, [1] = onboardingDone flag
    const allCalls = mockUpdate.mock.calls as { data: Record<string, unknown> }[][];
    const onboardingCall = allCalls.find((c) => c[0]?.data?.onboardingDone !== undefined);
    expect(onboardingCall).toBeDefined();
    expect(onboardingCall![0].data.onboardingDone).toBe(true);
    expect(onboardingCall![0].data.onboardingDoneAt).toBeInstanceOf(Date);
  });

  it("uses skipDuplicates: true (idempotent re-submission)", async () => {
    const req = buildJsonRequest({ answers: FULL_ANSWERS });
    await POST(req as never);

    const call = mockCreateMany.mock.calls[0][0] as { skipDuplicates: boolean };
    expect(call.skipDuplicates).toBe(true);
  });

  it("returns ok: true and next: /lessons on success", async () => {
    const req = buildJsonRequest({ answers: FULL_ANSWERS });
    const res = await POST(req as never);
    const body = await jsonBody(res);

    expect(body.ok).toBe(true);
    expect(body.next).toBe("/lessons");
  });
});

// ─── buildUserContext: practiceStyle and sensitivityBoundaries ────────────────

describe("buildUserContext — onboarding answer extraction", () => {
  it("extracts practice_style (short label) and sensitivityBoundaries from onboarding", async () => {
    const { buildUserContext } = await import("@/lib/cron/practice-builder");
    const { MessageCadence }   = await import("@prisma/client");

    const user = {
      id: "u1", displayName: "Seeker", currentLevel: 2, xpTotal: 50,
      emailVerifiedAt: new Date(), unsubscribedAt: null, subscription: null,
      profile: { tradition: "Buddhism", intent: "Reflection", bio: null, timezone: null },
      onboarding: [
        { questionKey: "practice_style",         answer: "Journaling — I process through writing" },
        { questionKey: "sensitivity_boundaries",  answer: "Please avoid content involving death" },
      ],
      journeyLevels: [], practiceResponses: [], dialogues: [],
    };

    const ctx = buildUserContext(user as never, MessageCadence.WEEKLY, new Date());
    expect(ctx.practiceStyle).toBe("Journaling");
    expect(ctx.sensitivityBoundaries).toBe("Please avoid content involving death");
  });

  it("returns null when onboarding answers are absent", async () => {
    const { buildUserContext } = await import("@/lib/cron/practice-builder");
    const { MessageCadence }   = await import("@prisma/client");

    const user = {
      id: "u2", displayName: "Seeker", currentLevel: 1, xpTotal: 0,
      emailVerifiedAt: new Date(), unsubscribedAt: null, subscription: null,
      profile: { tradition: null, intent: null, bio: null, timezone: null },
      onboarding: [],
      journeyLevels: [], practiceResponses: [], dialogues: [],
    };

    const ctx = buildUserContext(user as never, MessageCadence.DAILY, new Date());
    expect(ctx.practiceStyle).toBeNull();
    expect(ctx.sensitivityBoundaries).toBeNull();
  });
});
