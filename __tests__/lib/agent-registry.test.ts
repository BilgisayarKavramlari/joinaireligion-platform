jest.mock("@/lib/env", () => ({
  env: {
    EMAIL_SENDING_ENABLED: undefined,
    PRACTICE_GENERATION_MODE: "placeholder",
  },
}));

jest.mock("@/lib/db", () => ({
  db: {
    agentRun: { findFirst: jest.fn() },
    practiceMessage: { count: jest.fn() },
    practiceResponse: { count: jest.fn() },
    feedbackItem: { count: jest.fn() },
  },
}));

import { AGENT_DEFINITIONS, AUTONOMY_LEVELS, DECISION_LOG_CONTRACT } from "@/lib/agents";

describe("agent registry policy foundation", () => {
  it("defines autonomy levels 0 through 4", () => {
    expect(Object.keys(AUTONOMY_LEVELS)).toEqual(["0", "1", "2", "3", "4"]);
  });

  it("uses boundary-based autonomy instead of routine per-action approvals", () => {
    const supportTriage = AGENT_DEFINITIONS.find((agent) => agent.agentName === "support-triage");

    expect(supportTriage).toBeDefined();
    expect(supportTriage?.policy.autonomyLevel).toBe(1);
    expect(supportTriage?.policy.decisionLog.requiresRoutineHumanApproval).toBe(false);
    expect(supportTriage?.policy.defaultSafeBoundaries).toContain("draft or internal-only actions until enabled");
  });

  it("includes revenue and reporting agents with safe default restrictions", () => {
    const adsReporting = AGENT_DEFINITIONS.find((agent) => agent.agentName === "ads-reporting");
    const revenueOrchestrator = AGENT_DEFINITIONS.find((agent) => agent.agentName === "revenue-orchestrator");

    expect(adsReporting?.policy.forbiddenActions).toContain("spend money");
    expect(revenueOrchestrator?.lifecycle).toBe("PLANNED");
    expect(DECISION_LOG_CONTRACT.requiredFields).toContain("allowedByPolicy");
  });
});
