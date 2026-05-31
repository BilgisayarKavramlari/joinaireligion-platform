jest.mock("@/lib/env", () => ({
  env: {
    CRON_SECRET: "test-secret",
    EMAIL_SENDING_ENABLED: undefined,
    PRACTICE_GENERATION_MODE: "placeholder",
    OPENAI_API_KEY: undefined,
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  },
}));

const mockCookiesGet = jest.fn();
const mockGetSession = jest.fn();
const mockFeedbackItem = { create: jest.fn(), count: jest.fn() };
const mockUser = { findUnique: jest.fn(), count: jest.fn() };
const mockUserLesson = { findMany: jest.fn(), create: jest.fn() };
const mockLesson = { findFirst: jest.fn(), create: jest.fn() };
const mockQueryRaw = jest.fn();
const mockAgentRun = { findFirst: jest.fn() };
const mockPracticeMessage = { count: jest.fn() };
const mockPracticeResponse = { count: jest.fn() };
const mockUserJourneyState = { count: jest.fn() };
const mockOnboardingAnswer = { groupBy: jest.fn() };

jest.mock("next/headers", () => ({
  cookies: jest.fn(() => ({ get: mockCookiesGet })),
}));

jest.mock("@/lib/auth", () => ({
  getSessionFromCookie: (...args: unknown[]) => mockGetSession(...args),
}));

jest.mock("@/lib/db", () => ({
  db: {
    feedbackItem: mockFeedbackItem,
    user: mockUser,
    userLesson: mockUserLesson,
    lesson: mockLesson,
    $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
    agentRun: mockAgentRun,
    practiceMessage: mockPracticeMessage,
    practiceResponse: mockPracticeResponse,
    userJourneyState: mockUserJourneyState,
    onboardingAnswer: mockOnboardingAnswer,
  },
}));

import { NextRequest } from "next/server";
import { POST as feedbackPOST } from "@/app/api/feedback/route";
import { GET as lessonsGET } from "@/app/api/lessons/route";
import { GET as healthGET } from "@/app/api/admin/autonomy/health/route";

function buildRequest(method: "GET" | "POST", body?: unknown, authHeader?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (authHeader) headers.Authorization = authHeader;
  return new NextRequest("http://localhost:3000/api/test", {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe("Task 2 — feedback ownership", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFeedbackItem.create.mockResolvedValue({ id: "fb_001" });
  });

  it("links logged-in feedback to the authenticated user and stores metadata", async () => {
    mockCookiesGet.mockReturnValue({ value: "cookie" });
    mockGetSession.mockReturnValue({ userId: "user_123", email: "seeker@example.com", role: "USER" });

    const req = new NextRequest("http://localhost:3000/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "JestAgent/1.0",
        "Accept-Language": "tr-TR,tr;q=0.9",
      },
      body: JSON.stringify({
        category: "BUG",
        message: "Logged-in feedback should attach to the user.",
        pageUrl: "/lessons?step=1",
        locale: "tr-TR",
      }),
    });

    const res = await feedbackPOST(req);
    expect(res.status).toBe(201);
    expect(mockFeedbackItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user_123",
          submitterEmail: "seeker@example.com",
          submitterLocale: "tr-TR",
          pageUrl: "/lessons?step=1",
          pageContext: "/lessons?step=1",
          userAgent: "JestAgent/1.0",
          authState: "AUTHENTICATED",
        }),
      })
    );
  });

  it("keeps anonymous feedback anonymous when no session exists", async () => {
    mockCookiesGet.mockReturnValue(undefined);
    mockGetSession.mockReturnValue(null);

    const req = new NextRequest("http://localhost:3000/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "AnonAgent/1.0",
        "Accept-Language": "en-US,en;q=0.8",
      },
      body: JSON.stringify({
        category: "FEATURE_REQUEST",
        message: "Anonymous users should still be able to send feedback.",
        pageContext: "/",
      }),
    });

    const res = await feedbackPOST(req);
    expect(res.status).toBe(201);
    expect(mockFeedbackItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: null,
          submitterEmail: null,
          authState: "ANONYMOUS",
          pageUrl: "/",
        }),
      })
    );
  });
});

describe("Task 2 — onboarding access guard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCookiesGet.mockReturnValue({ value: "cookie" });
  });

  it("redirects verified non-onboarded users away from lessons content", async () => {
    mockGetSession.mockReturnValue({ userId: "user_guard", email: "guard@example.com", role: "USER" });
    mockUser.findUnique.mockResolvedValue({
      id: "user_guard",
      email: "guard@example.com",
      role: "USER",
      emailVerifiedAt: new Date("2026-05-30T00:00:00.000Z"),
      onboardingDone: false,
    });

    const res = await lessonsGET();
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.code).toBe("ONBOARDING_REQUIRED");
    expect(body.next).toBe("/onboarding");
  });

  it("allows admin bypass for non-onboarded admin users", async () => {
    mockGetSession.mockReturnValue({ userId: "admin_guard", email: "admin@example.com", role: "ADMIN" });
    mockUser.findUnique.mockResolvedValue({
      id: "admin_guard",
      email: "admin@example.com",
      role: "ADMIN",
      emailVerifiedAt: new Date("2026-05-30T00:00:00.000Z"),
      onboardingDone: false,
    });
    mockUserLesson.findMany.mockResolvedValue([]);
    mockLesson.findFirst.mockResolvedValue({
      id: "lesson_1",
      stepNumber: 1,
      title: "Step 1",
      isTemplate: true,
      forUserId: null,
    });
    mockUserLesson.create.mockResolvedValue({
      id: "user_lesson_1",
      lessonId: "lesson_1",
      status: "PENDING",
      xpEarned: 0,
      lesson: { id: "lesson_1", stepNumber: 1, title: "Step 1" },
      attempts: [],
    });

    const res = await lessonsGET();
    expect(res.status).toBe(200);
  });
});

describe("Task 2 — health integrity warnings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryRaw.mockResolvedValue([{ n: BigInt(0) }]);
    mockAgentRun.findFirst.mockResolvedValue(null);
    mockPracticeMessage.count.mockResolvedValue(0);
    mockPracticeResponse.count.mockResolvedValue(0);
    mockUserJourneyState.count.mockResolvedValue(5);
    mockOnboardingAnswer.groupBy.mockResolvedValue([]);
    mockUser.count.mockImplementation(async ({ where }: { where?: Record<string, unknown> } = {}) => {
      if (where?.onboardingDone === false) return 2;
      return 5;
    });
    mockFeedbackItem.count.mockImplementation(async ({ where }: { where?: Record<string, unknown> } = {}) => {
      if (where?.authState === "AUTHENTICATED" && where?.userId === null) return 4;
      if (where?.authState === "AUTHENTICATED") return 10;
      return 0;
    });
  });

  it("warns when authenticated feedback is being stored anonymously", async () => {
    const req = buildRequest("GET", undefined, "Bearer test-secret");
    const res = await healthGET(req);
    const body = await res.json() as { findings: { key: string; level: string; value: number }[] };

    const finding = body.findings.find((f) => f.key === "feedback_authenticated_anonymous_rate");
    expect(finding).toBeDefined();
    expect(finding?.level).toBe("warning");
    expect(finding?.value).toBe(4);
  });

  it("warns when verified non-onboarded users already have activity", async () => {
    const req = buildRequest("GET", undefined, "Bearer test-secret");
    const res = await healthGET(req);
    const body = await res.json() as { findings: { key: string; level: string; value: number }[] };

    const finding = body.findings.find((f) => f.key === "verified_not_onboarded_with_activity");
    expect(finding).toBeDefined();
    expect(finding?.level).toBe("warning");
    expect(finding?.value).toBe(2);
  });
});
