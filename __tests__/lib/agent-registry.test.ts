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
    contentItem: { count: jest.fn() },
    agentArtifact: { count: jest.fn() },
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
    expect(supportTriage?.lifecycle).toBe("IMPLEMENTED");
    expect(supportTriage?.mode).toBe("SKELETON");
    expect(supportTriage?.policy.autonomyLevel).toBe(1);
    expect(supportTriage?.policy.decisionLog.requiresRoutineHumanApproval).toBe(false);
    expect(supportTriage?.policy.defaultSafeBoundaries).toContain("no replies");
  });

  it("includes revenue and reporting agents with safe default restrictions", () => {
    const adsReporting = AGENT_DEFINITIONS.find((agent) => agent.agentName === "ads-reporting");
    const revenueOrchestrator = AGENT_DEFINITIONS.find((agent) => agent.agentName === "revenue-orchestrator");

    expect(adsReporting?.policy.forbiddenActions).toContain("spend money");
    expect(adsReporting?.lifecycle).toBe("IMPLEMENTED");
    expect(adsReporting?.mode).toBe("REPORT_ONLY");
    expect(revenueOrchestrator?.lifecycle).toBe("IMPLEMENTED");
    expect(revenueOrchestrator?.mode).toBe("REPORT_ONLY");
    expect(DECISION_LOG_CONTRACT.requiredFields).toContain("allowedByPolicy");
  });

  it("separates content production, publication, performance, and social delivery", () => {
    const producer = AGENT_DEFINITIONS.find((agent) => agent.agentName === "seo-kulliyat-draft");
    const publisher = AGENT_DEFINITIONS.find((agent) => agent.agentName === "content-publisher");
    const performance = AGENT_DEFINITIONS.find((agent) => agent.agentName === "content-performance");
    const socialPublisher = AGENT_DEFINITIONS.find((agent) => agent.agentName === "social-publisher");

    expect(producer?.policy.forbiddenActions).toContain("publish content");
    expect(publisher?.policy.autonomyLevel).toBe(3);
    expect(publisher?.policy.defaultSafeBoundaries).toContain("two-agent separation of duties");
    expect(performance?.policy.forbiddenActions).toContain("profile individual users");
    expect(socialPublisher?.policy.forbiddenActions).toContain("spend advertising money");
  });

  it("keeps reflective video downstream of completed public audio", () => {
    const videoPublisher = AGENT_DEFINITIONS.find((agent) => agent.agentName === "video-publisher");
    expect(videoPublisher?.lifecycle).toBe("IMPLEMENTED");
    expect(videoPublisher?.mode).toBe("LIVE");
    expect(videoPublisher?.policy.allowedActions).toContain("read ready podcast artifacts");
    expect(videoPublisher?.policy.forbiddenActions).toContain("include private user material");
  });
});
