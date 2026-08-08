import type { AutonomyLevel } from "@/lib/agents";

export interface AgentDecisionLog {
  version: "2026-05-30";
  agentName: string;
  action: string;
  autonomyLevel: AutonomyLevel;
  allowedByPolicy: boolean;
  policyRule: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  escalated: boolean;
  inputSummary: string;
  outputSummary: string;
  occurredAt: string;
}

export function buildAgentDecisionLog(input: Omit<AgentDecisionLog, "version">): AgentDecisionLog {
  return {
    version: "2026-05-30",
    ...input,
  };
}
