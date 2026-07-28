jest.mock("@/lib/env", () => ({ env: { CRON_SECRET: "cron-test-secret" } }));

const mockRunGrowthAgentByName = jest.fn();
jest.mock("@/lib/growth-agents/runners", () => ({
  runGrowthAgentByName: (...args: unknown[]) => mockRunGrowthAgentByName(...args),
}));

import { handleGrowthAgentRequest } from "@/lib/growth-agents/http";

describe("growth agent cron HTTP boundary", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects requests without the exact cron secret", async () => {
    const response = await handleGrowthAgentRequest(new Request("http://localhost/api/cron/ads-reporting", { method: "POST" }), "ads-reporting");
    expect(response.status).toBe(401);
    expect(mockRunGrowthAgentByName).not.toHaveBeenCalled();
  });

  it("runs the selected bounded agent when authorized", async () => {
    mockRunGrowthAgentByName.mockResolvedValue({ ok: true, agentName: "ads-reporting", agentRunId: "run_1", output: { spendChanged: false } });
    const response = await handleGrowthAgentRequest(new Request("http://localhost/api/cron/ads-reporting", {
      method: "POST",
      headers: { authorization: "Bearer cron-test-secret" },
    }), "ads-reporting");

    expect(response.status).toBe(200);
    expect(mockRunGrowthAgentByName).toHaveBeenCalledWith("ads-reporting");
    await expect(response.json()).resolves.toMatchObject({ ok: true, output: { spendChanged: false } });
  });

  it("does not expose internal error details", async () => {
    mockRunGrowthAgentByName.mockRejectedValue(new Error("database-password"));
    const response = await handleGrowthAgentRequest(new Request("http://localhost/api/cron/cfo-reporting", {
      method: "POST",
      headers: { authorization: "Bearer cron-test-secret" },
    }), "cfo-reporting");
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("database-password");
  });
});
