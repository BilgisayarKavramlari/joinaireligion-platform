/**
 * /admin/autonomy
 *
 * Admin-only autonomous operations dashboard.
 *
 * Server component — fetches data on render.
 * Interactive action buttons are delegated to the AutonomyActions client component.
 *
 * Shows:
 *   - System health (live from /api/admin/autonomy/health)
 *   - Latest AgentRun records (last 10)
 *   - Practice generation stats (last 7 days)
 *   - Email queue stats
 *   - Scoring stats
 *   - Onboarding completion stats
 *   - Failed jobs
 *   - Recommended actions from the health report
 *   - Action buttons: Run health check, Run safe repair, Dry-run generation,
 *                     Dry-run email delivery, Run scoring
 */

export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { AgentRunStatus, DeliveryStatus, GenerationStatus } from "@prisma/client";
import AutonomyActions from "./AutonomyActions";

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = {
  page:      { padding: "2rem", fontFamily: "system-ui, sans-serif", color: "#ede8dc", maxWidth: "1100px", margin: "0 auto" } as React.CSSProperties,
  h1:        { fontFamily: "Georgia,serif", fontSize: "1.8rem", color: "#f0d47a", marginBottom: "0.25rem" } as React.CSSProperties,
  sub:       { fontSize: "0.78rem", color: "rgba(237,232,220,0.45)", marginBottom: "2rem", letterSpacing: "0.05em" } as React.CSSProperties,
  section:   { marginBottom: "2rem" } as React.CSSProperties,
  sectionH:  { fontSize: "0.62rem", letterSpacing: "0.25em", textTransform: "uppercase" as const, color: "rgba(237,232,220,0.4)", marginBottom: "0.8rem" },
  grid:      { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: "0.75rem" } as React.CSSProperties,
  card:      { padding: "1rem 1.2rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,162,39,0.15)", borderRadius: "0.75rem" } as React.CSSProperties,
  val:       { fontSize: "1.7rem", fontFamily: "Georgia,serif", fontWeight: 700, color: "#f0d47a", lineHeight: 1, margin: "0.2rem 0" } as React.CSSProperties,
  label:     { fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase" as const, color: "rgba(237,232,220,0.4)" },
  badge:     (s: string): React.CSSProperties => ({
    display: "inline-block", padding: "0.15em 0.55em", borderRadius: "0.3em", fontSize: "0.68rem", fontWeight: 700,
    background: s === "OK" || s === "SUCCESS" ? "rgba(80,200,100,0.15)" : s === "WARNING" ? "rgba(240,200,60,0.15)" : "rgba(220,60,60,0.15)",
    color:      s === "OK" || s === "SUCCESS" ? "#5dc870" : s === "WARNING" ? "#f0d47a" : "#e05050",
    border:     `1px solid ${s === "OK" || s === "SUCCESS" ? "#5dc870" : s === "WARNING" ? "#f0d47a" : "#e05050"}`,
  }),
  table:     { width: "100%", borderCollapse: "collapse" as const, fontSize: "0.8rem" },
  th:        { textAlign: "left" as const, padding: "0.4rem 0.6rem", fontSize: "0.6rem", letterSpacing: "0.15em", textTransform: "uppercase" as const, color: "rgba(237,232,220,0.35)", borderBottom: "1px solid rgba(255,255,255,0.06)" },
  td:        { padding: "0.45rem 0.6rem", borderBottom: "1px solid rgba(255,255,255,0.04)", verticalAlign: "top" as const },
  warn:      { background: "rgba(240,180,40,0.06)", border: "1px solid rgba(240,180,40,0.2)", borderRadius: "0.5rem", padding: "0.6rem 0.9rem", fontSize: "0.82rem", marginBottom: "0.4rem", color: "#f0d47a" } as React.CSSProperties,
  crit:      { background: "rgba(220,60,60,0.06)", border: "1px solid rgba(220,60,60,0.2)", borderRadius: "0.5rem", padding: "0.6rem 0.9rem", fontSize: "0.82rem", marginBottom: "0.4rem", color: "#e05050" } as React.CSSProperties,
  action:    { background: "rgba(80,200,100,0.06)", border: "1px solid rgba(80,200,100,0.2)", borderRadius: "0.5rem", padding: "0.5rem 0.8rem", fontSize: "0.78rem", marginBottom: "0.35rem", color: "#5dc870" } as React.CSSProperties,
  fix:       { background: "rgba(100,160,240,0.06)", border: "1px solid rgba(100,160,240,0.2)", borderRadius: "0.5rem", padding: "0.5rem 0.8rem", fontSize: "0.78rem", marginBottom: "0.35rem", color: "#70a0f0" } as React.CSSProperties,
  human:     { background: "rgba(240,140,40,0.06)", border: "1px solid rgba(240,140,40,0.2)", borderRadius: "0.5rem", padding: "0.5rem 0.8rem", fontSize: "0.78rem", marginBottom: "0.35rem", color: "#f08c28" } as React.CSSProperties,
};

// ─── Data fetchers ────────────────────────────────────────────────────────────

async function fetchHealthReport() {
  const appUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const cronSecret = env.CRON_SECRET ?? "";
  try {
    const res = await fetch(`${appUrl}/api/admin/autonomy/health`, {
      headers: { Authorization: `Bearer ${cronSecret}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json() as Promise<{
      status: string;
      checkedAt: string;
      findings: { key: string; level: string; message: string; value?: unknown }[];
      recommendedActions: string[];
      safeAutoFixActions: string[];
      requiresHumanApproval: string[];
    }>;
  } catch {
    return null;
  }
}

async function fetchAgentRuns() {
  return db.agentRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 10,
    select: {
      id: true, agentName: true, taskType: true, status: true,
      startedAt: true, completedAt: true, durationMs: true, errorMessage: true,
      output: true,
    },
  });
}

async function fetchQueueStats() {
  const [queued, failed, sent, unscored, totalMessages] = await Promise.all([
    db.practiceMessage.count({ where: { deliveryStatus: DeliveryStatus.QUEUED } }),
    db.practiceMessage.count({ where: { deliveryStatus: DeliveryStatus.FAILED } }),
    db.practiceMessage.count({ where: { deliveryStatus: DeliveryStatus.SENT } }),
    db.practiceResponse.count({ where: { score: null } }),
    db.practiceMessage.count(),
  ]);
  return { queued, failed, sent, unscored, totalMessages };
}

async function fetchOnboardingStats() {
  const [totalVerified, withOnboarding, withJourneyState] = await Promise.all([
    db.user.count({ where: { emailVerifiedAt: { not: null } } }),
    db.onboardingAnswer.groupBy({ by: ["userId"] }).then((r) => r.length),
    db.userJourneyState.count(),
  ]);
  return { totalVerified, withOnboarding, withJourneyState };
}

async function fetchGenerationStats() {
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [total7d, aiGenerated7d, placeholderGenerated7d] = await Promise.all([
    db.practiceMessage.count({ where: { generatedAt: { gte: since7d } } }),
    db.practiceMessage.count({
      where: {
        generatedAt: { gte: since7d },
        generationStatus: GenerationStatus.GENERATED,
        promptVersion: { name: "practice-gen" },
      },
    }),
    db.practiceMessage.count({
      where: {
        generatedAt: { gte: since7d },
        promptVersion: { name: "practice-placeholder" },
      },
    }),
  ]);
  return { total7d, aiGenerated7d, placeholderGenerated7d };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={S.card}>
      <p style={S.label}>{label}</p>
      <p style={S.val}>{value}</p>
      {sub && <p style={{ fontSize: "0.65rem", color: "rgba(237,232,220,0.35)", marginTop: "0.2rem" }}>{sub}</p>}
    </div>
  );
}

function fmt(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

import type React from "react";

export default async function AutonomyDashboard() {
  try { await requireAdminSession(); } catch { redirect("/admin/login"); }

  const [health, agentRuns, queueStats, onboardingStats, genStats] = await Promise.all([
    fetchHealthReport(),
    fetchAgentRuns(),
    fetchQueueStats(),
    fetchOnboardingStats(),
    fetchGenerationStats(),
  ]);

  const statusColor = health?.status === "OK" ? "#5dc870" : health?.status === "WARNING" ? "#f0d47a" : "#e05050";

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Autonomous Operations</h1>
      <p style={S.sub}>
        System health &amp; self-repair dashboard &nbsp;·&nbsp; Admin only
        {health && <> &nbsp;·&nbsp; Last checked: {fmt(new Date(health.checkedAt))}</>}
      </p>

      {/* ── Overall status ── */}
      {health && (
        <div style={{ ...S.card, marginBottom: "1.5rem", borderColor: statusColor }}>
          <span style={S.badge(health.status)}>
            {health.status === "OK" ? "✓ " : health.status === "WARNING" ? "⚠ " : "✕ "}
            {health.status}
          </span>
          <span style={{ marginLeft: "0.8rem", fontSize: "0.82rem", color: "rgba(237,232,220,0.55)" }}>
            {health.findings.filter(f => f.level !== "ok").length} issue(s) detected
          </span>
        </div>
      )}

      {/* ── Action buttons (client component) ── */}
      <AutonomyActions />

      {/* ── Queue stats ── */}
      <div style={S.section}>
        <p style={S.sectionH}>Practice Message Queue</p>
        <div style={S.grid}>
          <StatCard label="Queued" value={queueStats.queued} sub="Awaiting delivery" />
          <StatCard label="Failed" value={queueStats.failed} sub="Delivery failed" />
          <StatCard label="Sent (all-time)" value={queueStats.sent} />
          <StatCard label="Unscored Responses" value={queueStats.unscored} sub="Awaiting scoring" />
          <StatCard label="Total Messages" value={queueStats.totalMessages} />
        </div>
      </div>

      {/* ── Generation stats ── */}
      <div style={S.section}>
        <p style={S.sectionH}>Practice Generation (last 7 days)</p>
        <div style={S.grid}>
          <StatCard label="Total Generated" value={genStats.total7d} />
          <StatCard label="AI-Generated" value={genStats.aiGenerated7d} sub="OpenAI mode" />
          <StatCard label="Placeholder" value={genStats.placeholderGenerated7d} sub="Deterministic" />
          <StatCard label="Generation Mode" value={env.PRACTICE_GENERATION_MODE ?? "placeholder"} />
        </div>
      </div>

      {/* ── Onboarding stats ── */}
      <div style={S.section}>
        <p style={S.sectionH}>User & Onboarding Stats</p>
        <div style={S.grid}>
          <StatCard label="Verified Users" value={onboardingStats.totalVerified} />
          <StatCard label="With Onboarding" value={onboardingStats.withOnboarding}
            sub={`${onboardingStats.totalVerified > 0 ? Math.round(onboardingStats.withOnboarding / onboardingStats.totalVerified * 100) : 0}%`} />
          <StatCard label="With Journey State" value={onboardingStats.withJourneyState}
            sub={`${onboardingStats.totalVerified - onboardingStats.withJourneyState} missing`} />
          <StatCard label="Email Mode" value={env.EMAIL_SENDING_ENABLED === "true" ? "LIVE" : "LOG_ONLY"} />
        </div>
      </div>

      {/* ── Health findings ── */}
      {health && (health.findings.some(f => f.level !== "ok") || health.recommendedActions.length > 0) && (
        <div style={S.section}>
          <p style={S.sectionH}>Findings & Recommended Actions</p>
          {health.findings.filter(f => f.level === "critical").map(f => (
            <div key={f.key} style={S.crit}>✕ {f.message}</div>
          ))}
          {health.findings.filter(f => f.level === "warning").map(f => (
            <div key={f.key} style={S.warn}>⚠ {f.message}</div>
          ))}
          {health.recommendedActions.map((a, i) => (
            <div key={i} style={S.action}>→ {a}</div>
          ))}
          {health.safeAutoFixActions.map((a, i) => (
            <div key={i} style={S.fix}>🔧 {a}</div>
          ))}
          {health.requiresHumanApproval.map((a, i) => (
            <div key={i} style={S.human}>👤 {a}</div>
          ))}
        </div>
      )}

      {/* ── Agent run history ── */}
      <div style={S.section}>
        <p style={S.sectionH}>Recent Agent Runs (last 10)</p>
        <div style={{ overflow: "auto" }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Agent</th>
                <th style={S.th}>Task Type</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Started</th>
                <th style={S.th}>Duration</th>
                <th style={S.th}>Error</th>
              </tr>
            </thead>
            <tbody>
              {agentRuns.map(run => (
                <tr key={run.id}>
                  <td style={S.td}>{run.agentName}</td>
                  <td style={{ ...S.td, fontSize: "0.72rem", color: "rgba(237,232,220,0.5)" }}>{run.taskType}</td>
                  <td style={S.td}><span style={S.badge(run.status)}>{run.status}</span></td>
                  <td style={{ ...S.td, fontSize: "0.72rem", color: "rgba(237,232,220,0.5)" }}>{fmt(run.startedAt)}</td>
                  <td style={{ ...S.td, fontSize: "0.72rem" }}>
                    {run.durationMs != null ? `${(run.durationMs / 1000).toFixed(1)}s` : "—"}
                  </td>
                  <td style={{ ...S.td, fontSize: "0.7rem", color: "#e05050", maxWidth: "280px", wordBreak: "break-word" }}>
                    {run.errorMessage ?? "—"}
                  </td>
                </tr>
              ))}
              {agentRuns.length === 0 && (
                <tr><td colSpan={6} style={{ ...S.td, color: "rgba(237,232,220,0.35)", fontStyle: "italic" }}>No agent runs recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Failed jobs ── */}
      {agentRuns.filter(r => r.status === AgentRunStatus.FAILED).length > 0 && (
        <div style={S.section}>
          <p style={S.sectionH}>Failed Jobs (recent)</p>
          {agentRuns.filter(r => r.status === AgentRunStatus.FAILED).map(run => (
            <div key={run.id} style={S.crit}>
              <strong>{run.agentName}</strong> — {fmt(run.startedAt)}<br />
              <span style={{ fontSize: "0.74rem" }}>{run.errorMessage ?? "No error message"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
