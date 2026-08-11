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
const mockContentItem = { count: jest.fn() };
const mockAgentArtifact = { count: jest.fn() };
const mockGetCurrentUser = jest.fn();

jest.mock("@/lib/db", () => ({
  db: {
    agentRun: mockAgentRun,
    practiceMessage: mockPracticeMessage,
    practiceResponse: mockPracticeResponse,
    feedbackItem: mockFeedbackItem,
    contentItem: mockContentItem,
    agentArtifact: mockAgentArtifact,
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
    mockContentItem.count.mockResolvedValue(4);
    mockAgentArtifact.count.mockResolvedValue(2);
  });

  it("returns 401 without an admin session", async () => {
    const response = await GET(makeRequest());
    expect(response.status).toBe(401);
  });

  it("returns implemented agents with policy metadata", async () => {
    mockGetCurrentUser.mockReturnValue({ id: "admin_1", email: "admin@example.com", role: "ADMIN" });
    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.agents).toHaveLength(18);

    const practiceGenerator = body.agents.find((agent: { agentName: string }) => agent.agentName === "practice-generator");
    const supportTriage = body.agents.find((agent: { agentName: string }) => agent.agentName === "support-triage");
    const revenueOrchestrator = body.agents.find((agent: { agentName: string }) => agent.agentName === "revenue-orchestrator");
    const responseScorer = body.agents.find((agent: { agentName: string }) => agent.agentName === "response-scorer");
    const localeBackfill = body.agents.find((agent: { agentName: string }) => agent.agentName === "content-locale-backfill");
    const distributionPublisher = body.agents.find((agent: { agentName: string }) => agent.agentName === "distribution-publisher");

    expect(practiceGenerator.latestAgentRun.taskType).toBe("GENERATE_DAILY_BATCH");
    expect(practiceGenerator.backlogCount).toBe(3);
    expect(supportTriage.lifecycle).toBe("IMPLEMENTED");
    expect(supportTriage.mode).toBe("SKELETON");
    expect(supportTriage.status).toBe("IDLE");
    expect(supportTriage.backlogCount).toBe(7);
    expect(supportTriage.statusReason).toContain("endpoint and cron script");
    expect(revenueOrchestrator.lifecycle).toBe("IMPLEMENTED");
    expect(revenueOrchestrator.mode).toBe("REPORT_ONLY");
    expect(revenueOrchestrator.backlogCount).toBe(2);
    expect(responseScorer.status).toBe("FAILED");
    expect(localeBackfill.mode).toBe("LIVE");
    expect(localeBackfill.nextScheduledRunAt).toEqual(expect.any(String));
    expect(localeBackfill.policy.defaultSafeBoundaries).toContain("additive writes only");
    expect(distributionPublisher.mode).toBe("LIVE");
    expect(distributionPublisher.policy.forbiddenActions).toContain("retry an ambiguous insert");
    expect(body.governanceRoles).toEqual(expect.arrayContaining([
      expect.objectContaining({ roleName: "EMA", autonomyLevel: 4, requiresRoutineHumanApproval: false }),
      expect.objectContaining({ roleName: "FLA", autonomyLevel: 1, requiresRoutineHumanApproval: false }),
    ]));
    expect(body.ownerOverrideContract).toMatchObject({
      source: "explicit-owner-command",
      projectPolicyPrecedence: "highest",
      mayBeInferred: false,
      mustBeScopeBound: true,
      mustBeLogged: true,
    });
    expect(body.decisionLogContract.requiresRoutineHumanApproval).toBe(false);
  });
});
