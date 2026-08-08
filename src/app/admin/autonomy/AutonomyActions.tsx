"use client";

/**
 * AutonomyActions — client component for the autonomy dashboard.
 *
 * Provides interactive buttons for triggering operational tasks.
 * Each button calls the corresponding API endpoint and shows a result
 * inline without a full page refresh.
 */

import { useState } from "react";

type ActionResult = {
  ok: boolean;
  label: string;
  data: unknown;
  error?: string;
};

const BTN: React.CSSProperties = {
  padding: "0.55rem 1.1rem",
  borderRadius: "0.5rem",
  border: "1px solid rgba(201,162,39,0.3)",
  background: "rgba(255,255,255,0.04)",
  color: "#f0d47a",
  fontSize: "0.8rem",
  cursor: "pointer",
  fontFamily: "system-ui, sans-serif",
  marginRight: "0.5rem",
  marginBottom: "0.5rem",
  transition: "background 0.15s",
};

const BTN_ACTIVE: React.CSSProperties = {
  ...BTN,
  background: "rgba(201,162,39,0.12)",
  cursor: "default",
};

const BTN_REPAIR: React.CSSProperties = {
  ...BTN,
  borderColor: "rgba(100,160,240,0.35)",
  color: "#70a0f0",
};

const PRE: React.CSSProperties = {
  background: "rgba(0,0,0,0.3)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: "0.5rem",
  padding: "1rem",
  fontSize: "0.72rem",
  color: "rgba(237,232,220,0.7)",
  overflowX: "auto",
  maxHeight: "300px",
  overflowY: "auto",
  marginTop: "0.75rem",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

export default function AutonomyActions() {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  async function run(label: string, url: string, method = "GET") {
    if (loading) return;
    setLoading(label);
    setResult(null);
    try {
      const res = await fetch(url, { method });
      const data = await res.json();
      setResult({ ok: res.ok, label, data });
    } catch (err) {
      setResult({ ok: false, label, data: null, error: String(err) });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={{ marginBottom: "1.75rem" }}>
      <p style={{ fontSize: "0.62rem", letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(237,232,220,0.4)", marginBottom: "0.8rem" }}>
        Actions
      </p>

      {/* Health check */}
      <button
        style={loading === "Health Check" ? BTN_ACTIVE : BTN}
        onClick={() => run("Health Check", "/api/admin/autonomy/health")}
        disabled={!!loading}
        aria-busy={loading === "Health Check"}
      >
        {loading === "Health Check" ? "Checking…" : "▶ Run Health Check"}
      </button>

      {/* Safe repair */}
      <button
        style={loading === "Safe Repair" ? { ...BTN_REPAIR, cursor: "default" } : BTN_REPAIR}
        onClick={() => run("Safe Repair", "/api/cron/autonomy-repair", "POST")}
        disabled={!!loading}
        aria-busy={loading === "Safe Repair"}
      >
        {loading === "Safe Repair" ? "Repairing…" : "🔧 Run Safe Repair"}
      </button>

      <button
        style={loading === "Retry Social Publishing" ? { ...BTN_REPAIR, cursor: "default" } : BTN_REPAIR}
        onClick={() => run("Retry Social Publishing", "/api/admin/autonomy/social-publisher", "POST")}
        disabled={!!loading}
        aria-busy={loading === "Retry Social Publishing"}
        title="Retries only unfinished providers; already-published deliveries remain idempotently skipped."
      >
        {loading === "Retry Social Publishing" ? "Retrying…" : "↻ Retry Social Publishing"}
      </button>

      {/* Practice generation dry-run */}
      <button
        style={loading === "Generate (dry-run)" ? BTN_ACTIVE : BTN}
        onClick={() => run("Generate (dry-run)", "/api/cron/generate-practices", "POST")}
        disabled={!!loading}
        title="Runs practice generation. Uses PLACEHOLDER mode unless PRACTICE_GENERATION_MODE=openai."
      >
        {loading === "Generate (dry-run)" ? "Generating…" : "📋 Run Practice Generation"}
      </button>

      {/* Email delivery dry-run */}
      <button
        style={loading === "Email Delivery (dry-run)" ? BTN_ACTIVE : BTN}
        onClick={() => run("Email Delivery (dry-run)", "/api/cron/send-practice-emails?mode=DRY_RUN", "POST")}
        disabled={!!loading}
        title="Dry-run only — no emails are sent, no DB mutations."
      >
        {loading === "Email Delivery (dry-run)" ? "Running…" : "📨 Email Delivery (DRY_RUN)"}
      </button>

      {/* Scoring */}
      <button
        style={loading === "Run Scoring" ? BTN_ACTIVE : BTN}
        onClick={() => run("Run Scoring", "/api/cron/score-practice-responses", "POST")}
        disabled={!!loading}
      >
        {loading === "Run Scoring" ? "Scoring…" : "⭐ Run Scoring"}
      </button>

      {/* Result panel */}
      {result && (
        <div style={{ marginTop: "0.5rem" }}>
          <span style={{
            display: "inline-block", padding: "0.15em 0.6em", borderRadius: "0.3em",
            fontSize: "0.7rem", fontWeight: 700, marginBottom: "0.3rem",
            background: result.ok ? "rgba(80,200,100,0.12)" : "rgba(220,60,60,0.12)",
            color: result.ok ? "#5dc870" : "#e05050",
            border: `1px solid ${result.ok ? "#5dc870" : "#e05050"}`,
          }}>
            {result.label}: {result.ok ? "OK" : "FAILED"}
          </span>
          <pre style={PRE}>
            {result.error ?? JSON.stringify(result.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
