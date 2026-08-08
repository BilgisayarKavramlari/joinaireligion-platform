export const dynamic = "force-dynamic";

import type React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin";
import {
  AGENT_GOVERNANCE_ROLES,
  AUTONOMY_LEVELS,
  OWNER_OVERRIDE_CONTRACT,
  getAgentRegistrySnapshot,
} from "@/lib/agents";

const S = {
  page: { padding: "2rem", fontFamily: "system-ui, sans-serif", color: "#ede8dc", maxWidth: "1240px", margin: "0 auto" } as React.CSSProperties,
  h1: { fontFamily: "Georgia,serif", fontSize: "1.8rem", color: "#f0d47a", marginBottom: "0.25rem" } as React.CSSProperties,
  sub: { fontSize: "0.78rem", color: "rgba(237,232,220,0.45)", marginBottom: "1.6rem", letterSpacing: "0.05em" } as React.CSSProperties,
  sectionH: { fontSize: "0.62rem", letterSpacing: "0.25em", textTransform: "uppercase" as const, color: "rgba(237,232,220,0.4)", marginBottom: "0.8rem" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: "0.75rem" } as React.CSSProperties,
  card: { padding: "1rem 1.1rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,162,39,0.15)", borderRadius: "0.75rem" } as React.CSSProperties,
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: "0.8rem" },
  th: { textAlign: "left" as const, padding: "0.45rem 0.6rem", fontSize: "0.6rem", letterSpacing: "0.15em", textTransform: "uppercase" as const, color: "rgba(237,232,220,0.35)", borderBottom: "1px solid rgba(255,255,255,0.08)" },
  td: { padding: "0.55rem 0.6rem", borderBottom: "1px solid rgba(255,255,255,0.04)", verticalAlign: "top" as const },
};

function badge(status: string): React.CSSProperties {
  const map: Record<string, { background: string; color: string; border: string }> = {
    ACTIVE: { background: "rgba(80,200,100,0.15)", color: "#5dc870", border: "#5dc870" },
    IDLE: { background: "rgba(240,200,60,0.15)", color: "#f0d47a", border: "#f0d47a" },
    INACTIVE: { background: "rgba(120,130,150,0.16)", color: "#c6cfdd", border: "#8090a0" },
    FAILED: { background: "rgba(220,60,60,0.15)", color: "#e05050", border: "#e05050" },
    BLOCKED: { background: "rgba(120,90,220,0.18)", color: "#b59cff", border: "#b59cff" },
  };
  const colors = map[status] ?? map.IDLE;
  return {
    display: "inline-block",
    padding: "0.15rem 0.55rem",
    borderRadius: "0.3rem",
    fontSize: "0.68rem",
    fontWeight: 700,
    background: colors.background,
    color: colors.color,
    border: `1px solid ${colors.border}`,
  };
}

function fmt(value: string | null) {
  if (!value) return "—";
  return value.replace("T", " ").slice(0, 16) + " UTC";
}

export default async function AdminAgentsPage() {
  try {
    await requireAdminSession();
  } catch {
    redirect("/admin/login");
  }

  const agents = await getAgentRegistrySnapshot();
  const implemented = agents.filter((agent) => agent.lifecycle === "IMPLEMENTED");
  const planned = agents.filter((agent) => agent.lifecycle === "PLANNED");
  const active = agents.filter((agent) => agent.status === "ACTIVE").length;
  const failed = agents.filter((agent) => agent.status === "FAILED").length;

  return (
    <div style={S.page}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <div>
          <h1 style={S.h1}>Agent Registry</h1>
          <p style={S.sub}>
            Canonical registry for implemented and planned autonomous agents. Policy-based autonomy only. No routine per-action approvals.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <Link href="/admin" style={{ padding: "0.5rem 1rem", borderRadius: "0.5rem", border: "1px solid rgba(201,162,39,0.25)", color: "rgba(237,232,220,0.7)", textDecoration: "none", fontSize: "0.78rem", background: "rgba(255,255,255,0.02)" }}>
            Dashboard
          </Link>
          <Link href="/admin/autonomy" style={{ padding: "0.5rem 1rem", borderRadius: "0.5rem", border: "1px solid rgba(201,162,39,0.25)", color: "rgba(237,232,220,0.7)", textDecoration: "none", fontSize: "0.78rem", background: "rgba(255,255,255,0.02)" }}>
            Autonomy
          </Link>
        </div>
      </div>

      <div style={{ ...S.grid, marginBottom: "1.8rem" }}>
        <div style={S.card}>
          <div style={{ fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(237,232,220,0.4)" }}>Implemented</div>
          <div style={{ fontFamily: "Georgia,serif", fontSize: "1.8rem", color: "#f0d47a" }}>{implemented.length}</div>
        </div>
        <div style={S.card}>
          <div style={{ fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(237,232,220,0.4)" }}>Planned</div>
          <div style={{ fontFamily: "Georgia,serif", fontSize: "1.8rem", color: "#f0d47a" }}>{planned.length}</div>
        </div>
        <div style={S.card}>
          <div style={{ fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(237,232,220,0.4)" }}>Active</div>
          <div style={{ fontFamily: "Georgia,serif", fontSize: "1.8rem", color: "#5dc870" }}>{active}</div>
        </div>
        <div style={S.card}>
          <div style={{ fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(237,232,220,0.4)" }}>Failed</div>
          <div style={{ fontFamily: "Georgia,serif", fontSize: "1.8rem", color: failed > 0 ? "#e05050" : "#ede8dc" }}>{failed}</div>
        </div>
      </div>

      <section style={{ marginBottom: "1.8rem" }}>
        <div style={S.sectionH}>Governance Roles</div>
        <div style={S.grid}>
          {AGENT_GOVERNANCE_ROLES.map((role) => (
            <div key={role.roleName} style={S.card}>
              <div style={{ color: "#f0d47a", fontWeight: 700, marginBottom: "0.35rem" }}>{role.title}</div>
              <div style={{ fontSize: "0.78rem", color: "rgba(237,232,220,0.65)", lineHeight: 1.5 }}>{role.responsibility}</div>
              <div style={{ fontSize: "0.72rem", color: "rgba(237,232,220,0.45)", marginTop: "0.55rem" }}>
                Level {role.autonomyLevel} · no routine approval
              </div>
            </div>
          ))}
          <div style={S.card}>
            <div style={{ color: "#f0d47a", fontWeight: 700, marginBottom: "0.35rem" }}>Owner Override</div>
            <div style={{ fontSize: "0.78rem", color: "rgba(237,232,220,0.65)", lineHeight: 1.5 }}>
              Explicit owner commands have the highest project-policy precedence for their stated target and scope.
            </div>
            <div style={{ fontSize: "0.72rem", color: "rgba(237,232,220,0.45)", marginTop: "0.55rem" }}>
              Inferred: {OWNER_OVERRIDE_CONTRACT.mayBeInferred ? "yes" : "no"} · logged: {OWNER_OVERRIDE_CONTRACT.mustBeLogged ? "yes" : "no"}
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: "1.8rem" }}>
        <div style={S.sectionH}>Autonomy Levels</div>
        <div style={S.grid}>
          {Object.entries(AUTONOMY_LEVELS).map(([level, meta]) => (
            <div key={level} style={S.card}>
              <div style={{ fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(237,232,220,0.4)" }}>
                Level {level}
              </div>
              <div style={{ color: "#f0d47a", fontWeight: 700, margin: "0.25rem 0 0.35rem" }}>{meta.label}</div>
              <div style={{ fontSize: "0.78rem", color: "rgba(237,232,220,0.65)", lineHeight: 1.5 }}>{meta.description}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: "1.8rem" }}>
        <div style={S.sectionH}>Registered Agents</div>
        <div style={{ ...S.card, overflowX: "auto" }}>
          <table style={S.table}>
            <thead>
              <tr>
                {["Agent", "Lifecycle", "Status", "Mode", "Autonomy", "Backlog", "Last Run", "Next Run", "Latest AgentRun"].map((heading) => (
                  <th key={heading} style={S.th}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent.agentName}>
                  <td style={S.td}>
                    <div style={{ fontWeight: 700, color: "#f0d47a" }}>{agent.title}</div>
                    <div style={{ fontSize: "0.72rem", color: "rgba(237,232,220,0.65)" }}>{agent.agentName}</div>
                    <div style={{ fontSize: "0.72rem", color: "rgba(237,232,220,0.4)", marginTop: "0.25rem", maxWidth: 220 }}>{agent.description}</div>
                  </td>
                  <td style={S.td}>{agent.lifecycle}</td>
                  <td style={S.td}>
                    <span style={badge(agent.status)}>{agent.status}</span>
                    <div style={{ fontSize: "0.72rem", color: "rgba(237,232,220,0.45)", marginTop: "0.35rem", maxWidth: 210 }}>{agent.statusReason}</div>
                  </td>
                  <td style={S.td}>{agent.mode}</td>
                  <td style={S.td}>
                    <div>Level {agent.autonomyLevel}</div>
                    <div style={{ fontSize: "0.72rem", color: "rgba(237,232,220,0.45)", marginTop: "0.25rem" }}>
                      {AUTONOMY_LEVELS[agent.autonomyLevel].label}
                    </div>
                  </td>
                  <td style={S.td}>
                    <div>{agent.backlogCount ?? "—"}</div>
                    <div style={{ fontSize: "0.72rem", color: "rgba(237,232,220,0.45)", marginTop: "0.25rem" }}>{agent.backlogLabel}</div>
                  </td>
                  <td style={S.td}>{fmt(agent.lastRunAt)}</td>
                  <td style={S.td}>{fmt(agent.nextScheduledRunAt)}</td>
                  <td style={S.td}>
                    {agent.latestAgentRun ? (
                      <>
                        <div>{agent.latestAgentRun.status}</div>
                        <div style={{ fontSize: "0.72rem", color: "rgba(237,232,220,0.45)", marginTop: "0.25rem" }}>{agent.latestAgentRun.taskType}</div>
                      </>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div style={S.sectionH}>Policy Foundation</div>
        <div style={{ ...S.card, display: "grid", gap: "0.8rem" }}>
          <div style={{ fontSize: "0.82rem", color: "rgba(237,232,220,0.75)", lineHeight: 1.6 }}>
            All agents in this registry are defined with default safe boundaries, forbidden actions, and abnormal-case escalation rules. Routine in-policy actions are designed to proceed without owner approval.
          </div>
          <div style={{ fontSize: "0.72rem", color: "rgba(237,232,220,0.55)" }}>
            Structured decision logging is required for every autonomous action. The shared log contract is exposed via <code>/api/admin/agents</code>.
          </div>
        </div>
      </section>
    </div>
  );
}
