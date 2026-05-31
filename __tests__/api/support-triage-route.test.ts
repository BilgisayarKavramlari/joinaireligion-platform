import { AgentRunStatus, FeedbackStatus } from "@prisma/client";

const mockAgentRunCreate = jest.fn();
const mockAgentRunUpdate = jest.fn();
const mockFeedbackItemFindMany = jest.fn();

jest.mock("@/lib/db", () => ({
  db: {
    agentRun: {
      create: (...args: unknown[]) => mockAgentRunCreate(...args),
      update: (...args: unknown[]) => mockAgentRunUpdate(...args),
    },
    feedbackItem: {
      findMany: (...args: unknown[]) => mockFeedbackItemFindMany(...args),
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
    mockAgentRunCreate.mockResolvedValue({ id: "run_support_001" });
    mockAgentRunUpdate.mockResolvedValue({});
    mockFeedbackItemFindMany.mockResolvedValue([
      { id: "fb_1", message: "I was charged twice and need a refund." },
      { id: "fb_2", message: "The onboarding is still in English." },
      { id: "fb_3", message: "The lesson page crashes with a 500 error." },
      { id: "fb_4", message: "Buy now http://spam.example http://spam2.example free money" },
    ]);
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

  it("reads only OPEN feedback items and limits sample results to safe ids plus classifications", async () => {
    mockFeedbackItemFindMany.mockResolvedValue(
      Array.from({ length: 7 }, (_, index) => ({
        id: `fb_${index + 1}`,
        message: `The navigation is confusing on screen ${index + 1}.`,
      }))
    );

    const response = await POST(makeRequest("test-cron-secret"));
    const body = await response.json();

    await POST(makeRequest("test-cron-secret"));

    expect(mockFeedbackItemFindMany).toHaveBeenCalledTimes(2);
    expect(mockFeedbackItemFindMany).toHaveBeenLastCalledWith({
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
});
