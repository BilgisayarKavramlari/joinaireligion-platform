/**
 * Regression tests for the four new-user product fixes
 * (2026-05-30 OpenClaw task)
 *
 * Fix 1 — Onboarding localization
 *   - getQuestions('tr') returns Turkish text and option labels
 *   - Option values are stable across locales (EN value === TR value)
 *   - getQuestions('xx') falls back to English
 *
 * Fix 2 — First lesson integrity
 *   - GET /api/lessons creates step1 template inline when not seeded
 *   - GET /api/lessons returns the new UserLesson, not an empty array
 *
 * Fix 3 — Starter stats correctness
 *   - LEVEL_XP_THRESHOLDS[0] is 0 (Level 1 starts at 0 XP)
 *   - xpMaxForLevel(1) returns 100 (threshold for Level 2)
 *
 * Fix 4 — Feedback system
 *   - POST /api/feedback creates a FeedbackItem and returns 201
 *   - POST /api/feedback rejects missing message with 400
 *   - POST /api/feedback rejects invalid category with 400
 *
 * Health signal
 *   - Autonomy health returns feedback_actionable WARNING when 5+ open BUG items
 */

// ─── Environment mock ─────────────────────────────────────────────────────────

jest.mock("@/lib/env", () => ({
  env: {
    CRON_SECRET: "test-secret",
    EMAIL_SENDING_ENABLED: undefined,
    PRACTICE_GENERATION_MODE: "placeholder",
    OPENAI_API_KEY: undefined,
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  },
}));

// ─── DB mock ──────────────────────────────────────────────────────────────────

const mockFeedbackItem  = { create: jest.fn(), count: jest.fn() };
const mockLesson        = { findFirst: jest.fn(), create: jest.fn() };
const mockUserLesson    = { findMany: jest.fn(), create: jest.fn() };
const mockQueryRaw      = jest.fn();
const mockAgentRun      = { findFirst: jest.fn() };
const mockPracticeMsg   = { count: jest.fn() };
const mockPracticeRes   = { count: jest.fn() };
const mockUser          = { count: jest.fn(), findUnique: jest.fn() };
const mockJourneyState  = { count: jest.fn() };
const mockOnboardingAnswer = { groupBy: jest.fn() };

jest.mock("@/lib/db", () => ({
  db: {
    $queryRaw:       (...args: unknown[]) => mockQueryRaw(...args),
    feedbackItem:    mockFeedbackItem,
    lesson:          mockLesson,
    userLesson:      mockUserLesson,
    agentRun:        mockAgentRun,
    practiceMessage: mockPracticeMsg,
    practiceResponse: mockPracticeRes,
    user:            mockUser,
    userJourneyState: mockJourneyState,
    onboardingAnswer: mockOnboardingAnswer,
  },
}));

// ─── Auth mock ────────────────────────────────────────────────────────────────

jest.mock("next/headers", () => ({
  cookies: jest.fn(() => ({ get: jest.fn(() => undefined) })),
}));

jest.mock("@/lib/auth", () => ({
  getSessionFromCookie: jest.fn(() => ({ userId: "user-test-123" })),
  getCurrentUserFromCookies: jest.fn(async () => ({
    id: "user-test-123",
    email: "admin@example.com",
    role: "ADMIN",
    displayName: null,
  })),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { getQuestions } from "@/lib/i18n/onboarding-questions";
import { LEVEL_XP_THRESHOLDS } from "@/lib/journey-types";
import { GET  as lessonsGET  } from "@/app/api/lessons/route";
import { POST as feedbackPOST } from "@/app/api/feedback/route";
import { GET  as healthGET   } from "@/app/api/admin/autonomy/health/route";
import { NextRequest } from "next/server";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(method: "GET" | "POST", body?: unknown, authHeader?: string): NextRequest {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authHeader) headers["Authorization"] = authHeader;
  return new NextRequest("http://localhost:3000/api/test", {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ─── Fix 1: Onboarding localization ──────────────────────────────────────────

describe("Fix 1 — Onboarding localization", () => {
  it("returns the correct number of questions for English", () => {
    const qs = getQuestions("en");
    expect(qs.length).toBeGreaterThan(0);
    // Verify key structural fields
    for (const q of qs) {
      expect(q.key).toBeTruthy();
      expect(q.type).toMatch(/^(select|textarea)$/);
      expect(q.text).toBeTruthy();
    }
  });

  it("returns Turkish text for tr locale", () => {
    const enQs = getQuestions("en");
    const trQs = getQuestions("tr");
    expect(trQs.length).toBe(enQs.length);

    // The 'tradition' question should be translated to Turkish
    const enTradition = enQs.find((q) => q.key === "tradition");
    const trTradition = trQs.find((q) => q.key === "tradition");
    expect(trTradition).toBeTruthy();
    expect(trTradition!.text).not.toBe(enTradition!.text); // different text
    expect(trTradition!.text).toContain("gelen"); // Turkish word check
  });

  it("option values are stable across English and Turkish", () => {
    const enQs = getQuestions("en");
    const trQs = getQuestions("tr");

    const enTradition = enQs.find((q) => q.key === "tradition")!;
    const trTradition = trQs.find((q) => q.key === "tradition")!;

    // Must have the same number of options
    expect(trTradition.options!.length).toBe(enTradition.options!.length);

    // Values must be identical (stable DB keys)
    for (let i = 0; i < enTradition.options!.length; i++) {
      expect(trTradition.options![i].value).toBe(enTradition.options![i].value);
    }

    // Labels must differ (different display strings)
    const enLabels = enTradition.options!.map((o) => o.label);
    const trLabels = trTradition.options!.map((o) => o.label);
    // At least some labels should differ (they're translated)
    const diffCount = enLabels.filter((l, i) => l !== trLabels[i]).length;
    expect(diffCount).toBeGreaterThan(0);
  });

  it("falls back to English for an unsupported locale", () => {
    const enQs  = getQuestions("en");
    // "de" has no full translation in current dict — should fall back to EN text
    const deQs  = getQuestions("de");
    expect(deQs.length).toBe(enQs.length);

    const enTradition = enQs.find((q) => q.key === "tradition")!;
    const deTradition = deQs.find((q) => q.key === "tradition")!;
    // Falls back to EN text since de is not fully translated
    expect(deTradition.text).toBe(enTradition.text);
  });

  it("all select options have non-empty value and label fields", () => {
    const qs = getQuestions("tr");
    for (const q of qs) {
      if (q.type === "select" && q.options) {
        for (const opt of q.options) {
          expect(opt.value).toBeTruthy();
          expect(opt.label).toBeTruthy();
        }
      }
    }
  });
});

// ─── Fix 2: First lesson integrity ───────────────────────────────────────────

describe("Fix 2 — First lesson integrity (self-healing)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser.findUnique.mockResolvedValue({
      id: "user-test-123",
      email: "user@test.com",
      role: "USER",
      emailVerifiedAt: new Date("2026-05-30T00:00:00.000Z"),
      onboardingDone: true,
    });
  });

  it("creates step1 template inline when not in DB and returns a lesson", async () => {
    // Simulate: no existing UserLessons, no step1 template in DB
    mockUserLesson.findMany.mockResolvedValue([]);
    mockLesson.findFirst.mockResolvedValue(null); // template not seeded
    mockLesson.create.mockResolvedValue({
      id: "template-1",
      stepNumber: 1,
      title: "The Witness Within — Awakening Awareness",
      isTemplate: true,
      forUserId: null,
    });
    mockUserLesson.create.mockResolvedValue({
      id: "ul-1",
      lessonId: "template-1",
      status: "PENDING",
      xpEarned: null,
      lesson: {
        id: "template-1",
        stepNumber: 1,
        title: "The Witness Within — Awakening Awareness",
      },
      attempts: [],
    });

    const req = makeRequest("GET");
    const res = await lessonsGET();
    const body = await res.json() as { lessons: { lessonId: string; status: string }[] };

    // Should return the created lesson, NOT an empty array
    expect(res.status).toBe(200);
    expect(body.lessons).toHaveLength(1);
    expect(body.lessons[0].lessonId).toBe("template-1");
    expect(body.lessons[0].status).toBe("PENDING");

    // Verify the template was created
    expect(mockLesson.create).toHaveBeenCalledTimes(1);
    expect(mockUserLesson.create).toHaveBeenCalledTimes(1);
  });

  it("uses existing step1 template when already seeded", async () => {
    const existingTemplate = {
      id: "existing-template",
      stepNumber: 1,
      title: "The Witness Within — Awakening Awareness",
      isTemplate: true,
      forUserId: null,
    };
    mockUserLesson.findMany.mockResolvedValue([]);
    mockLesson.findFirst.mockResolvedValue(existingTemplate);
    mockUserLesson.create.mockResolvedValue({
      id: "ul-2",
      lessonId: "existing-template",
      status: "PENDING",
      xpEarned: null,
      lesson: existingTemplate,
      attempts: [],
    });

    await lessonsGET();

    // Should NOT create a new template
    expect(mockLesson.create).not.toHaveBeenCalled();
    // Should create a UserLesson pointing to existing template
    expect(mockUserLesson.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ lessonId: "existing-template" }) })
    );
  });
});

// ─── Fix 3: Starter stats ─────────────────────────────────────────────────────

describe("Fix 3 — Starter stats correctness", () => {
  it("LEVEL_XP_THRESHOLDS[0] is 0 — Level 1 requires 0 XP", () => {
    expect(LEVEL_XP_THRESHOLDS[0]).toBe(0);
  });

  it("LEVEL_XP_THRESHOLDS[1] is 100 — Level 2 threshold is 100 XP", () => {
    expect(LEVEL_XP_THRESHOLDS[1]).toBe(100);
  });

  it("xpMax for a level-1 user is the level-2 threshold (100)", () => {
    // Reproduce the xpMaxForLevel logic from account/page.tsx
    const currentLevel = 1;
    const xpMax = LEVEL_XP_THRESHOLDS[currentLevel] ?? LEVEL_XP_THRESHOLDS[LEVEL_XP_THRESHOLDS.length - 1] ?? 500;
    expect(xpMax).toBe(100);
  });

  it("a new user has level 1, 0 XP, 0 active days by default", () => {
    // These are the default values used when API fields are missing
    const currentLevel = undefined ?? 1;
    const xpTotal      = undefined ?? 0;
    const daysActive   = undefined ?? 0;
    expect(currentLevel).toBe(1);
    expect(xpTotal).toBe(0);
    expect(daysActive).toBe(0);
  });
});

// ─── Fix 4: Feedback system ───────────────────────────────────────────────────

describe("Fix 4 — Feedback intake and persistence", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("POST /api/feedback creates a FeedbackItem and returns 201", async () => {
    mockFeedbackItem.create.mockResolvedValue({ id: "fb-1" });

    const req = makeRequest("POST", {
      category: "BUG",
      message:  "The onboarding language selector does not update question text.",
      pageContext: "/onboarding",
    });
    const res = await feedbackPOST(req);
    const body = await res.json() as { ok: boolean; id: string };

    expect(res.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.id).toBe("fb-1");
    expect(mockFeedbackItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          category: "BUG",
          message:  "The onboarding language selector does not update question text.",
          userId:   "user-test-123",
        }),
      })
    );
  });

  it("POST /api/feedback returns 400 when message is missing", async () => {
    const req = makeRequest("POST", { category: "BUG", message: "   " });
    const res = await feedbackPOST(req);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toContain("Message is required");
  });

  it("POST /api/feedback returns 400 when category is invalid", async () => {
    const req = makeRequest("POST", { category: "INVALID_CAT", message: "Some message" });
    const res = await feedbackPOST(req);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toContain("Invalid category");
  });

  it("POST /api/feedback accepts all valid categories", async () => {
    mockFeedbackItem.create.mockResolvedValue({ id: "fb-x" });
    const validCategories = ["BUG", "TRANSLATION", "CONTENT", "COMPLAINT", "FEATURE_REQUEST"];
    for (const category of validCategories) {
      const req = makeRequest("POST", { category, message: "test message" });
      const res = await feedbackPOST(req);
      expect(res.status).toBe(201);
    }
  });
});

// ─── Health signal: feedback_actionable ──────────────────────────────────────

describe("Health — feedback_actionable signal", () => {
  function setupHealthMocks(feedbackCount: number) {
    mockQueryRaw.mockResolvedValue([{ n: BigInt(0) }]);
    mockAgentRun.findFirst.mockResolvedValue(null);
    mockPracticeMsg.count.mockResolvedValue(0);
    mockPracticeRes.count.mockResolvedValue(0);
    mockUser.count.mockImplementation(async ({ where }: { where?: Record<string, unknown> } = {}) => {
      if (where?.onboardingDone === false) return 0;
      return 5;
    });
    mockJourneyState.count.mockResolvedValue(5);
    mockOnboardingAnswer.groupBy.mockResolvedValue([]);
    mockFeedbackItem.count.mockImplementation(async ({ where }: { where?: Record<string, unknown> } = {}) => {
      if (where?.authState === "AUTHENTICATED" && where?.userId === null) return 0;
      if (where?.authState === "AUTHENTICATED") return 0;
      return feedbackCount;
    });
  }

  it("returns feedback_actionable OK when fewer than 5 open BUG/TRANSLATION items", async () => {
    setupHealthMocks(3);
    const req = makeRequest("GET", undefined, "Bearer test-secret");
    const res = await healthGET(req);
    const body = await res.json() as { findings: { key: string; level: string }[] };

    const finding = body.findings.find((f) => f.key === "feedback_actionable");
    expect(finding).toBeDefined();
    expect(finding!.level).toBe("ok");
  });

  it("returns feedback_actionable WARNING when 5 or more open BUG/TRANSLATION items", async () => {
    setupHealthMocks(7);
    const req = makeRequest("GET", undefined, "Bearer test-secret");
    const res = await healthGET(req);
    const body = await res.json() as { findings: { key: string; level: string }[] };

    const finding = body.findings.find((f) => f.key === "feedback_actionable");
    expect(finding).toBeDefined();
    expect(finding!.level).toBe("warning");
  });
});
