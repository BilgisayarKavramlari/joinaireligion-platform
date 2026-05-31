import { AgentRunStatus, FeedbackStatus } from "@prisma/client";

const mockAgentRunCreate = jest.fn();
const mockAgentRunUpdate = jest.fn();
const mockFeedbackItemCount = jest.fn();

jest.mock("@/lib/db", () => ({
  db: {
    agentRun: {
      create: (...args: unknown[]) => mockAgentRunCreate(...args),
      update: (...args: unknown[]) => mockAgentRunUpdate(...args),
    },
    feedbackItem: {
      count: (...args: unknown[]) => mockFeedbackItemCount(...args),
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
    mockFeedbackItemCount.mockResolvedValue(4);
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
        taskType: "SUPPORT_TRIAGE_SKELETON",
        status: AgentRunStatus.RUNNING,
        input: expect.objectContaining({
          implementation: "skeleton",
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
          classified: 0,
          repliesDrafted: 0,
          repliesSent: 0,
          codingTasksCreated: 0,
        }),
      }),
    });
    expect(body.agentName).toBe("support-triage");
    expect(body.status).toBe(AgentRunStatus.SUCCESS);
  });

  it("counts only OPEN feedback items", async () => {
    await POST(makeRequest("test-cron-secret"));

    expect(mockFeedbackItemCount).toHaveBeenCalledTimes(1);
    expect(mockFeedbackItemCount).toHaveBeenCalledWith({
      where: { status: FeedbackStatus.OPEN },
    });
  });
});
