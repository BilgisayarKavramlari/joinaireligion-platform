jest.mock("@/lib/env", () => ({
  env: {
    CRON_SECRET: "test-cron-secret",
    EMAIL_SENDING_ENABLED: undefined,
    PRACTICE_GENERATION_MODE: "placeholder",
  },
}));

const mockAgentRun = { findFirst: jest.fn() };
const mockPracticeMessage = { count: jest.fn() };
const mockPracticeResponse = { count: jest.fn() };
const mockFeedbackItem = { count: jest.fn() };
const mockGetCurrentUser = jest.fn();

jest.mock("@/lib/db", () => ({
  db: {
    agentRun: mockAgentRun,
    practiceMessage: mockPracticeMessage,
    practiceResponse: mockPracticeResponse,
    feedbackItem: mockFeedbackItem,
  },
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn(() => ({ get: () => undefined })),
}));

jest.mock("@/lib/auth", () => ({
  getCurrentUserFromCookies: () => mockGetCurrentUser(),
}));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/agents/route";

function makeRequest(authHeader?: string): NextRequest {
  return new NextRequest("http://localhost/api/admin/agents", {
    method: "GET",
    headers: authHeader ? { Authorization: authHeader } : {},
  });
}

describe("GET /api/admin/agents", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockReturnValue(null);

    mockAgentRun.findFirst.mockImplementation(async ({ where }: { where: { agentName: string } }) => {
      if (where.agentName === "practice-generator") {
        return {
          id: "run_gen_1",
          taskType: "GENERATE_DAILY_BATCH",
          status: "SUCCESS",
          startedAt: new Date("2026-05-30T06:00:00.000Z"),
          completedAt: new Date("2026-05-30T06:02:00.000Z"),
          durationMs: 120000,
          errorMessage: null,
        };
      }

      if (where.agentName === "response-scorer") {
        return {
          id: "run_score_1",
          taskType: "SCORE_RESPONSE_BATCH",
          status: "FAILED",
          startedAt: new Date("2026-05-30T18:30:00.000Z"),
          completedAt: new Date("2026-05-30T18:31:00.000Z"),
          durationMs: 60000,
          errorMessage: "scoring regression",
        };
      }

      return null;
    });

    mockPracticeMessage.count.mockImplementation(async ({ where }: { where: Record<string, string> }) => {
      if (where.generationStatus === "PENDING") return 3;
      if (where.deliveryStatus === "QUEUED") return 5;
      return 0;
    });
    mockPracticeResponse.count.mockResolvedValue(2);
    mockFeedbackItem.count.mockResolvedValue(7);
  });

  it("returns 401 without an admin session", async () => {
    const response = await GET(makeRequest());
    expect(response.status).toBe(401);
  });

  it("returns implemented and planned agents with policy metadata", async () => {
    mockGetCurrentUser.mockReturnValue({ id: "admin_1", email: "admin@example.com", role: "ADMIN" });
    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.agents).toHaveLength(10);

    const practiceGenerator = body.agents.find((agent: { agentName: string }) => agent.agentName === "practice-generator");
    const supportTriage = body.agents.find((agent: { agentName: string }) => agent.agentName === "support-triage");
    const revenueOrchestrator = body.agents.find((agent: { agentName: string }) => agent.agentName === "revenue-orchestrator");
    const responseScorer = body.agents.find((agent: { agentName: string }) => agent.agentName === "response-scorer");

    expect(practiceGenerator.latestAgentRun.taskType).toBe("GENERATE_DAILY_BATCH");
    expect(practiceGenerator.backlogCount).toBe(3);
    expect(supportTriage.lifecycle).toBe("IMPLEMENTED");
    expect(supportTriage.mode).toBe("SKELETON");
    expect(supportTriage.status).toBe("IDLE");
    expect(supportTriage.backlogCount).toBe(7);
    expect(supportTriage.statusReason).toContain("endpoint and cron script");
    expect(revenueOrchestrator.mode).toBe("INACTIVE");
    expect(responseScorer.status).toBe("FAILED");
    expect(body.decisionLogContract.requiresRoutineHumanApproval).toBe(false);
  });
});
