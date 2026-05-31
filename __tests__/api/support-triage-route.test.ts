import { AgentRunStatus, FeedbackStatus, SupportTriageStatus } from "@prisma/client";

const mockAgentRunCreate = jest.fn();
const mockAgentRunUpdate = jest.fn();
const mockFeedbackItemFindMany = jest.fn();
const mockFeedbackItemUpdate = jest.fn();
const mockSupportTriageDecisionCreate = jest.fn();

jest.mock("@/lib/db", () => ({
  db: {
    agentRun: {
      create: (...args: unknown[]) => mockAgentRunCreate(...args),
      update: (...args: unknown[]) => mockAgentRunUpdate(...args),
    },
    feedbackItem: {
      findMany: (...args: unknown[]) => mockFeedbackItemFindMany(...args),
      update: (...args: unknown[]) => mockFeedbackItemUpdate(...args),
    },
    supportTriageDecision: {
      create: (...args: unknown[]) => mockSupportTriageDecisionCreate(...args),
    },
  },
}));

jest.mock("@/lib/env", () => ({
  env: {
    CRON_SECRET: "test-cron-secret",
  },
}));

import { POST } from "@/app/api/cron/support-triage/route";

function makeRequest(secret?: string): Request {
  return new Request("http://localhost/api/cron/support-triage", {
    method: "POST",
    headers: secret ? { Authorization: `Bearer ${secret}` } : {},
  });
}

describe("POST /api/cron/support-triage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAgentRunCreate.mockReset();
    mockAgentRunUpdate.mockReset();
    mockFeedbackItemFindMany.mockReset();
    mockFeedbackItemUpdate.mockReset();
    mockSupportTriageDecisionCreate.mockReset();

    mockAgentRunCreate.mockResolvedValue({ id: "run_support_001" });
    mockAgentRunUpdate.mockResolvedValue({});
    mockFeedbackItemUpdate.mockResolvedValue({});
    mockFeedbackItemFindMany.mockResolvedValue([
      { id: "fb_1", message: "I was charged twice and need a refund." },
      { id: "fb_2", message: "The onboarding is still in English." },
      { id: "fb_3", message: "The lesson page crashes with a 500 error." },
      { id: "fb_4", message: "Buy now http://spam.example http://spam2.example free money" },
    ]);
    let decisionCounter = 0;
    mockSupportTriageDecisionCreate.mockImplementation(async () => {
      decisionCounter += 1;
      return { id: `decision_${decisionCounter}` };
    });
  });

  it("returns 401 without a valid CRON_SECRET bearer token", async () => {
    const missingAuthResponse = await POST(makeRequest());
    expect(missingAuthResponse.status).toBe(401);
    expect(await missingAuthResponse.json()).toEqual({ error: "Unauthorized" });

    const wrongAuthResponse = await POST(makeRequest("wrong-secret"));
    expect(wrongAuthResponse.status).toBe(401);
    expect(mockAgentRunCreate).not.toHaveBeenCalled();
  });

  it("creates one support-triage AgentRun and closes it successfully", async () => {
    const response = await POST(makeRequest("test-cron-secret"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockAgentRunCreate).toHaveBeenCalledTimes(1);
    expect(mockAgentRunCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        agentName: "support-triage",
        taskType: "SUPPORT_TRIAGE_ANALYSIS",
        status: AgentRunStatus.RUNNING,
        input: expect.objectContaining({
          implementation: "dry-run-analysis",
        }),
      }),
    });
    expect(mockAgentRunUpdate).toHaveBeenCalledTimes(1);
    expect(mockSupportTriageDecisionCreate).toHaveBeenCalledTimes(4);
    expect(mockFeedbackItemUpdate).toHaveBeenCalledTimes(4);
    expect(mockAgentRunUpdate).toHaveBeenCalledWith({
      where: { id: "run_support_001" },
      data: expect.objectContaining({
        status: AgentRunStatus.SUCCESS,
        output: expect.objectContaining({
          openFeedbackCount: 4,
          analyzedCount: 4,
          categoryCounts: expect.objectContaining({
            BILLING: 1,
            I18N: 1,
            BUG: 1,
            SPAM: 1,
          }),
          severityCounts: expect.objectContaining({
            HIGH: 2,
            MEDIUM: 1,
            LOW: 1,
          }),
          actionCounts: expect.objectContaining({
            ESCALATE_TO_ADMIN: 1,
            MONITOR: 1,
            CREATE_CODING_TASK: 1,
            MARK_SPAM: 1,
          }),
          sampleResults: expect.arrayContaining([
            expect.objectContaining({
              id: "fb_1",
              category: "BILLING",
              severity: "HIGH",
              recommendedAction: "ESCALATE_TO_ADMIN",
            }),
          ]),
          repliesDrafted: 0,
          repliesSent: 0,
          codingTasksCreated: 0,
        }),
      }),
    });
    expect(body.agentName).toBe("support-triage");
    expect(body.status).toBe(AgentRunStatus.SUCCESS);
    expect(body.openFeedbackCount).toBe(4);
    expect(body.analyzedCount).toBe(4);
    expect(body.sampleResults).toHaveLength(4);
    expect(body.sampleResults[0]).toEqual({
      id: "fb_1",
      category: "BILLING",
      severity: "HIGH",
      recommendedAction: "ESCALATE_TO_ADMIN",
    });
    expect(JSON.stringify(body.sampleResults)).not.toContain("charged twice");
  });

  it("creates one SupportTriageDecision per analyzed item and updates current-state triage fields without changing FeedbackItem.status", async () => {
    await POST(makeRequest("test-cron-secret"));

    expect(mockSupportTriageDecisionCreate).toHaveBeenNthCalledWith(1, {
      data: {
        feedbackItemId: "fb_1",
        agentRunId: "run_support_001",
        decisionSource: "DETERMINISTIC",
        category: "BILLING",
        severity: "HIGH",
        recommendedAction: "ESCALATE_TO_ADMIN",
        reasonSummary: "Deterministic support-triage analysis.",
        reasonJson: {
          source: "deterministic",
          version: "phase-1-task-3a-1d",
          category: "BILLING",
          severity: "HIGH",
          recommendedAction: "ESCALATE_TO_ADMIN",
        },
      },
      select: { id: true },
    });

    const updateCall = mockFeedbackItemUpdate.mock.calls[0][0];
    expect(updateCall.where).toEqual({ id: "fb_1" });
    expect(updateCall.data).toEqual(
      expect.objectContaining({
        triageCategory: "BILLING",
        triageSeverity: "HIGH",
        recommendedAction: "ESCALATE_TO_ADMIN",
        triageStatus: SupportTriageStatus.TRIAGED,
        triageRunId: "run_support_001",
        latestTriageDecisionId: "decision_1",
      })
    );
    expect(updateCall.data).not.toHaveProperty("status");
  });

  it("reads only OPEN feedback items and limits sample results to safe ids plus classifications", async () => {
    mockFeedbackItemFindMany.mockResolvedValue(
      Array.from({ length: 7 }, (_, index) => ({
        id: `fb_${index + 1}`,
        message: `The navigation is confusing on screen ${index + 1}.`,
      }))
    );
    mockFeedbackItemUpdate.mockReset();
    mockSupportTriageDecisionCreate.mockImplementation(async ({ data }: { data: { feedbackItemId: string } }) => ({
      id: `decision_${data.feedbackItemId}`,
    }));
    mockFeedbackItemUpdate.mockResolvedValue({});

    const response = await POST(makeRequest("test-cron-secret"));
    const body = await response.json();

    expect(mockFeedbackItemFindMany).toHaveBeenCalledTimes(1);
    expect(mockFeedbackItemFindMany).toHaveBeenCalledWith({
      where: { status: FeedbackStatus.OPEN },
      select: {
        id: true,
        message: true,
      },
      orderBy: { createdAt: "asc" },
    });
    expect(body.openFeedbackCount).toBe(7);
    expect(body.analyzedCount).toBe(7);
    expect(body.sampleResults).toHaveLength(5);
    expect(body.sampleResults[0]).toEqual({
      id: "fb_1",
      category: "UX",
      severity: "LOW",
      recommendedAction: "AUTO_REPLY_DRAFT",
    });
  });

  it("repeated runs append decision history and point latestTriageDecisionId at the newest decision with preserved agentRun linkage", async () => {
    mockAgentRunCreate
      .mockResolvedValueOnce({ id: "run_support_001" })
      .mockResolvedValueOnce({ id: "run_support_002" });
    let decisionCounter = 0;
    mockSupportTriageDecisionCreate.mockReset();
    mockSupportTriageDecisionCreate.mockImplementation(async ({ data }: { data: { agentRunId: string; feedbackItemId: string } }) => {
      decisionCounter += 1;
      return { id: `decision_${data.agentRunId}_${data.feedbackItemId}_${decisionCounter}` };
    });
    mockFeedbackItemUpdate.mockReset();
    mockFeedbackItemUpdate.mockResolvedValue({});

    await POST(makeRequest("test-cron-secret"));
    await POST(makeRequest("test-cron-secret"));

    expect(mockSupportTriageDecisionCreate).toHaveBeenCalledTimes(8);
    expect(mockSupportTriageDecisionCreate.mock.calls[4][0]).toEqual({
      data: expect.objectContaining({
        feedbackItemId: "fb_1",
        agentRunId: "run_support_002",
      }),
      select: { id: true },
    });
    expect(mockFeedbackItemUpdate.mock.calls[4][0]).toEqual({
      where: { id: "fb_1" },
      data: expect.objectContaining({
        triageRunId: "run_support_002",
        latestTriageDecisionId: "decision_run_support_002_fb_1_5",
      }),
    });
  });
});
