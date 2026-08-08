import { buildAgentDecisionLog } from "@/lib/agent-decision-log";

describe("agent decision log", () => {
  it("persists the complete policy decision contract without raw inputs", () => {
    const log = buildAgentDecisionLog({
      agentName: "content-publisher",
      action: "INDEPENDENT_REVIEW_AND_PUBLISH",
      autonomyLevel: 3,
      allowedByPolicy: true,
      policyRule: "registry:content-publisher:LIVE:autonomy-3",
      riskLevel: "LOW",
      escalated: false,
      inputSummary: "Scheduled bounded agent execution with internal identifiers only.",
      outputSummary: "Completed with output fields: published, status.",
      occurredAt: "2026-08-07T00:00:00.000Z",
    });

    expect(log).toEqual(expect.objectContaining({
      version: "2026-05-30",
      agentName: "content-publisher",
      allowedByPolicy: true,
      riskLevel: "LOW",
      escalated: false,
    }));
    expect(Object.keys(log).sort()).toEqual([
      "action",
      "agentName",
      "allowedByPolicy",
      "autonomyLevel",
      "escalated",
      "inputSummary",
      "occurredAt",
      "outputSummary",
      "policyRule",
      "riskLevel",
      "version",
    ]);
  });
});
