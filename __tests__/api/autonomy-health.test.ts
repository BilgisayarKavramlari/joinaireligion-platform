/**
 * Tests for GET /api/admin/autonomy/health
 *
 * Covers:
 *   1. Returns 401 when authorization header is missing
 *   2. Returns 401 when Bearer token does not match CRON_SECRET
 *   3. Returns 200 with status OK when all checks pass
 *   4. Returns 200 with status CRITICAL when DB is unreachable (not 500)
 *   5. XP ledger raw SQL failure → WARNING finding, NOT a 500 error
 *   6. XP ledger SQL failure → recommendedActions includes db push suggestion
 *   7. XP duplicate rows found → CRITICAL finding
 *   8. Missing UserJourneyState → WARNING finding
 *   9. Missing onboarding answers → WARNING finding
 *  10. safeAutoFixActions populated when journey state missing
 */

// ─── Environment mock ─────────────────────────────────────────────────────────

jest.mock("@/lib/env", () => ({
  env: {
    CRON_SECRET: "test-cron-secret",
    EMAIL_SENDING_ENABLED: undefined,
    PRACTICE_GENERATION_MODE: "placeholder",
    OPENAI_API_KEY: undefined,
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  },
}));

// ─── DB mock ──────────────────────────────────────────────────────────────────

const mockQueryRaw    = jest.fn();
const mockAgentRun    = { findFirst: jest.fn() };
const mockPracticeMsg = { count: jest.fn() };
const mockPracticeRes = { count: jest.fn() };
const mockUser        = { count: jest.fn() };
const mockJourneyState = { count: jest.fn() };
const mockOnboardingAnswer = { groupBy: jest.fn() };
const mockFeedbackItem = { count: jest.fn() };

jest.mock("@/lib/db", () => ({
  db: {
    $queryRaw:           (...args: unknown[]) => mockQueryRaw(...args),
    agentRun:            mockAgentRun,
    practiceMessage:     mockPracticeMsg,
    practiceResponse:    mockPracticeRes,
    user:                mockUser,
    userJourneyState:    mockJourneyState,
    onboardingAnswer:    mockOnboardingAnswer,
    feedbackItem:        mockFeedbackItem,
  },
}));

// ─── Auth mock ────────────────────────────────────────────────────────────────

jest.mock("next/headers", () => ({
  cookies: jest.fn(() => ({ get: () => undefined })),
}));

jest.mock("@/lib/auth", () => ({
  getSessionFromCookie: jest.fn(() => null),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { GET } from "@/app/api/admin/autonomy/health/route";
import { NextRequest } from "next/server";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(authHeader?: string): NextRequest {
  return new NextRequest("http://localhost/api/admin/autonomy/health", {
    method: "GET",
    headers: authHeader ? { Authorization: authHeader } : {},
  });
}

async function callHealth(authHeader = "Bearer test-cron-secret") {
  const req = makeRequest(authHeader);
  const res = await GET(req);
  const body = await res.json();
  return { status: res.status, body };
}

function setupHappyPathMocks() {
  // DB connectivity — $queryRaw SELECT 1 succeeds
  mockQueryRaw.mockResolvedValue([{ "?column?": 1 }]);
  // AgentRuns: all ran recently
  const recentRun = { status: "SUCCESS", startedAt: new Date(), completedAt: new Date(), output: null };
  mockAgentRun.findFirst.mockResolvedValue(recentRun);
  // Queues: all empty
  mockPracticeMsg.count.mockResolvedValue(0);
  mockPracticeRes.count.mockResolvedValue(0);
  // Users: all have state and onboarding
  mockUser.count.mockResolvedValue(5);
  mockJourneyState.count.mockResolvedValue(5);
  mockOnboardingAnswer.groupBy.mockResolvedValue(
    Array.from({ length: 5 }, (_, i) => ({ userId: `u${i}` }))
  );
  // Feedback: no actionable items
  mockFeedbackItem.count.mockResolvedValue(0);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/admin/autonomy/health", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Auth ──────────────────────────────────────────────────────────────────

  it("returns 401 when Authorization header is absent", async () => {
    const req = makeRequest(); // no header
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 when Bearer token does not match CRON_SECRET", async () => {
    const { status } = await callHealth("Bearer wrong-secret");
    expect(status).toBe(401);
  });

  // ── DB connectivity failure: must be 200 not 500 ──────────────────────────

  it("returns 200 with CRITICAL status when DB is unreachable — never 500", async () => {
    // Both the SELECT 1 and subsequent queries will fail
    mockQueryRaw.mockRejectedValue(new Error("connection refused"));
    // These should NOT be called if DB is down, but set safe defaults anyway
    mockAgentRun.findFirst.mockResolvedValue(null);

    const { status, body } = await callHealth();
    expect(status).toBe(200);
    expect(body.status).toBe("CRITICAL");
    const dbFinding = body.findings.find((f: { key: string }) => f.key === "db_connectivity");
    expect(dbFinding).toBeDefined();
    expect(dbFinding.level).toBe("critical");
  });

  // ── XP ledger SQL failure: WARNING not 500 ────────────────────────────────

  it("returns 200 when XP ledger raw SQL fails — produces WARNING finding, not 500", async () => {
    // First call = SELECT 1 (connectivity check) → succeeds
    // Subsequent calls = normal DB operations
    mockQueryRaw
      .mockResolvedValueOnce([{ "?column?": 1 }]) // SELECT 1
      .mockRejectedValueOnce(                       // XP ledger duplicate check
        new Error('relation "xp_ledger" does not exist')
      );
    mockAgentRun.findFirst.mockResolvedValue({
      status: "SUCCESS", startedAt: new Date(), completedAt: new Date(), output: null,
    });
    mockPracticeMsg.count.mockResolvedValue(0);
    mockPracticeRes.count.mockResolvedValue(0);
    mockUser.count.mockResolvedValue(2);
    mockJourneyState.count.mockResolvedValue(2);
    mockOnboardingAnswer.groupBy.mockResolvedValue([{ userId: "u1" }, { userId: "u2" }]);
    mockFeedbackItem.count.mockResolvedValue(0);

    const { status, body } = await callHealth();

    // Must not be 500
    expect(status).toBe(200);

    // XP finding must exist and be WARNING, not throw
    const xpFinding = body.findings.find((f: { key: string }) => f.key === "xp_duplicate_risk");
    expect(xpFinding).toBeDefined();
    expect(xpFinding.level).toBe("warning");
    expect(xpFinding.message).toContain("query error");
  });

  it("XP SQL failure → recommendedActions includes db push suggestion", async () => {
    mockQueryRaw
      .mockResolvedValueOnce([{ "?column?": 1 }])
      .mockRejectedValueOnce(new Error('relation "xp_ledger" does not exist'));
    mockAgentRun.findFirst.mockResolvedValue({
      status: "SUCCESS", startedAt: new Date(), completedAt: new Date(), output: null,
    });
    mockPracticeMsg.count.mockResolvedValue(0);
    mockPracticeRes.count.mockResolvedValue(0);
    mockUser.count.mockResolvedValue(1);
    mockJourneyState.count.mockResolvedValue(1);
    mockOnboardingAnswer.groupBy.mockResolvedValue([{ userId: "u1" }]);
    mockFeedbackItem.count.mockResolvedValue(0);

    const { body } = await callHealth();

    // Should recommend running prisma db push
    expect(body.recommendedActions.some((a: string) => a.includes("prisma db push"))).toBe(true);
  });

  // ── XP duplicate rows: CRITICAL ───────────────────────────────────────────

  it("XP duplicate rows → CRITICAL finding", async () => {
    mockQueryRaw
      .mockResolvedValueOnce([{ "?column?": 1 }]) // SELECT 1
      .mockResolvedValueOnce([{ n: BigInt(3) }]);  // duplicate count = 3
    mockAgentRun.findFirst.mockResolvedValue({
      status: "SUCCESS", startedAt: new Date(), completedAt: new Date(), output: null,
    });
    mockPracticeMsg.count.mockResolvedValue(0);
    mockPracticeRes.count.mockResolvedValue(0);
    mockUser.count.mockResolvedValue(2);
    mockJourneyState.count.mockResolvedValue(2);
    mockOnboardingAnswer.groupBy.mockResolvedValue([{ userId: "u1" }, { userId: "u2" }]);
    mockFeedbackItem.count.mockResolvedValue(0);

    const { status, body } = await callHealth();

    expect(status).toBe(200);
    const xpFinding = body.findings.find((f: { key: string }) => f.key === "xp_duplicate_risk");
    expect(xpFinding.level).toBe("critical");
    expect(xpFinding.value).toBe(3);
    // Human approval required, not auto-fix
    expect(body.requiresHumanApproval.some((a: string) => a.includes("manual audit"))).toBe(true);
  });

  // ── Missing UserJourneyState: WARNING ─────────────────────────────────────

  it("users without UserJourneyState → WARNING finding + safeAutoFixActions", async () => {
    setupHappyPathMocks();
    // Override: 5 users but only 3 have journey state
    mockUser.count.mockResolvedValue(5);
    mockJourneyState.count.mockResolvedValue(3);

    const { body } = await callHealth();

    const jsFinding = body.findings.find((f: { key: string }) => f.key === "users_missing_journey_state");
    expect(jsFinding.level).toBe("warning");
    expect(jsFinding.value).toBe(2);
    expect(body.safeAutoFixActions.some((a: string) => a.includes("UserJourneyState"))).toBe(true);
  });

  // ── Missing onboarding answers ────────────────────────────────────────────

  it("users without onboarding answers → WARNING finding", async () => {
    setupHappyPathMocks();
    // Only 2 of 5 users have onboarding
    mockOnboardingAnswer.groupBy.mockResolvedValue([{ userId: "u1" }, { userId: "u2" }]);

    const { body } = await callHealth();

    const obFinding = body.findings.find((f: { key: string }) => f.key === "users_missing_onboarding");
    expect(obFinding.level).toBe("warning");
    expect(obFinding.value).toBe(3);
  });

  // ── Clean state: OK ───────────────────────────────────────────────────────

  it("returns status OK when all checks pass", async () => {
    setupHappyPathMocks();
    // XP check: 0 duplicates
    mockQueryRaw
      .mockResolvedValueOnce([{ "?column?": 1 }]) // SELECT 1
      .mockResolvedValueOnce([{ n: BigInt(0) }]);  // 0 duplicates

    const { status, body } = await callHealth();

    expect(status).toBe(200);
    expect(body.status).toBe("OK");
    expect(body.findings.every((f: { level: string }) => f.level === "ok")).toBe(true);
  });

  // ── Email delivery agent name regression ─────────────────────────────────
  //
  // The email delivery route writes agentName "practice-email-sender".
  // The health check previously queried for "email-delivery" — causing a
  // false "never run" warning even when emails had been sent successfully.
  // This test pins the correct behaviour.

  it("does NOT report 'never run' when a practice-email-sender AgentRun exists", async () => {
    setupHappyPathMocks();
    mockQueryRaw
      .mockResolvedValueOnce([{ "?column?": 1 }]) // SELECT 1
      .mockResolvedValueOnce([{ n: BigInt(0) }]);  // XP duplicate check

    const { body } = await callHealth();

    const emailFinding = body.findings.find(
      (f: { key: string }) => f.key === "agent_email_last_run"
    );
    expect(emailFinding).toBeDefined();
    expect(emailFinding.level).toBe("ok");
    expect(emailFinding.message).not.toContain("never run");
  });

  it("health check queries for agentName 'practice-email-sender' (not legacy 'email-delivery')", async () => {
    setupHappyPathMocks();
    mockQueryRaw
      .mockResolvedValueOnce([{ "?column?": 1 }])
      .mockResolvedValueOnce([{ n: BigInt(0) }]);

    await callHealth();

    // Verify at least one findFirst call included "practice-email-sender" in the filter
    const calls = mockAgentRun.findFirst.mock.calls as Array<[{ where: { agentName: unknown } }]>;
    const emailCall = calls.find((args) => {
      const nameFilter = args[0]?.where?.agentName;
      if (typeof nameFilter === "string") return nameFilter === "practice-email-sender";
      if (nameFilter && typeof nameFilter === "object" && "in" in nameFilter) {
        return (nameFilter as { in: string[] }).in.includes("practice-email-sender");
      }
      return false;
    });
    expect(emailCall).toBeDefined();
  });

  // ── Response structure ────────────────────────────────────────────────────

  it("response always contains required top-level fields", async () => {
    setupHappyPathMocks();
    mockQueryRaw
      .mockResolvedValueOnce([{ "?column?": 1 }])
      .mockResolvedValueOnce([{ n: BigInt(0) }]);

    const { body } = await callHealth();

    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("checkedAt");
    expect(body).toHaveProperty("findings");
    expect(body).toHaveProperty("recommendedActions");
    expect(body).toHaveProperty("safeAutoFixActions");
    expect(body).toHaveProperty("requiresHumanApproval");
    expect(Array.isArray(body.findings)).toBe(true);
  });
});
