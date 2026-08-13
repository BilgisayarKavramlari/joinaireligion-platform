export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/admin";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export default async function DialogueMetricsPage() {
  await requireAdminSession();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);
  const oneDayAgo = new Date(now.getTime() - 86_400_000);
  const [total, rows] = await Promise.all([
    db.aiDialogue.count(),
    db.aiDialogue.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: "desc" },
      take: 20_000,
      select: { createdAt: true, promptCharCount: true, totalTokens: true, latencyMs: true, safetyFlags: true, userPrompt: true, assistantResponse: true },
    }),
  ]);
  const outcomes = new Map<string, number>();
  const providerFailures = new Map<string, number>();
  let tokens = 0;
  let latency = 0;
  let latencyRows = 0;
  let privacyViolations = 0;
  for (const row of rows) {
    const safety = record(row.safetyFlags);
    const outcome = String(safety.outcome || "legacy_or_unknown");
    outcomes.set(outcome, (outcomes.get(outcome) || 0) + 1);
    if (outcome === "provider_failed" && typeof safety.providerFailureCode === "string") {
      const failure = safety.providerFailureCode.slice(0, 160);
      providerFailures.set(failure, (providerFailures.get(failure) || 0) + 1);
    }
    tokens += row.totalTokens || 0;
    if (row.latencyMs !== null) { latency += row.latencyMs; latencyRows += 1; }
    if (row.userPrompt !== "[not retained]" || row.assistantResponse !== null) privacyViolations += 1;
  }
  const last24h = rows.filter((row) => row.createdAt >= oneDayAgo).length;

  return (
    <main style={{ minHeight: "100vh", background: "#04000c", color: "#ede8dc", padding: "2rem" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
          <div><h1 style={{ color: "#f0d47a", marginBottom: ".3rem" }}>Reflection Companion</h1><p style={{ color: "rgba(237,232,220,.5)" }}>Aggregate operational metadata only. Questions, answers, user emails, and conversation identifiers are intentionally absent.</p></div>
          <Link href="/admin" style={{ color: "#c9a227" }}>Dashboard</Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: ".8rem", margin: "1.3rem 0" }}>
          {[
            ["24h turns", last24h], ["7d turns", rows.length], ["All-time metadata", total], ["7d tokens", tokens],
            ["Average latency", latencyRows ? `${Math.round(latency / latencyRows)} ms` : "—"], ["7d privacy violations", privacyViolations],
          ].map(([label, value]) => <section key={String(label)} style={{ padding: "1rem", border: "1px solid rgba(201,162,39,.16)", borderRadius: ".8rem" }}><small style={{ color: "rgba(237,232,220,.45)" }}>{label}</small><p style={{ color: "#f0d47a", fontSize: "1.7rem", margin: ".4rem 0 0" }}>{value}</p></section>)}
        </div>
        <section style={{ padding: "1rem", border: "1px solid rgba(201,162,39,.16)", borderRadius: ".8rem" }}>
          <h2 style={{ color: "#f0d47a", fontSize: "1rem" }}>Safety outcomes · 7 days</h2>
          {[...outcomes.entries()].sort((a, b) => b[1] - a[1]).map(([outcome, count]) => <div key={outcome} style={{ display: "flex", justifyContent: "space-between", padding: ".5rem 0", borderTop: "1px solid rgba(255,255,255,.05)" }}><span>{outcome}</span><strong>{count}</strong></div>)}
          {outcomes.size === 0 && <p style={{ color: "rgba(237,232,220,.45)" }}>No Reflection Companion use yet.</p>}
        </section>
        {providerFailures.size > 0 && <section style={{ marginTop: ".8rem", padding: "1rem", border: "1px solid rgba(201,162,39,.16)", borderRadius: ".8rem" }}>
          <h2 style={{ color: "#f0d47a", fontSize: "1rem" }}>Provider availability codes · 7 days</h2>
          {[...providerFailures.entries()].sort((a, b) => b[1] - a[1]).map(([failure, count]) => <div key={failure} style={{ display: "flex", justifyContent: "space-between", padding: ".5rem 0", borderTop: "1px solid rgba(255,255,255,.05)" }}><span>{failure}</span><strong>{count}</strong></div>)}
        </section>}
      </div>
    </main>
  );
}
