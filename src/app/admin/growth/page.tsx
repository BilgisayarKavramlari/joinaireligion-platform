export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { getTrafficSummary } from "@/lib/analytics/report";
import type { RankedMetric } from "@/lib/analytics/core";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function StatCard({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <section style={{ padding: "1rem", border: "1px solid rgba(201,162,39,.16)", borderRadius: ".8rem", background: "rgba(255,255,255,.025)" }}>
      <small style={{ color: "rgba(237,232,220,.42)", textTransform: "uppercase", letterSpacing: ".12em" }}>{label}</small>
      <p style={{ color: "#f0d47a", fontFamily: "Georgia,serif", fontSize: "1.8rem", margin: ".35rem 0 .15rem" }}>{value}</p>
      {note && <span style={{ color: "rgba(237,232,220,.38)", fontSize: ".7rem" }}>{note}</span>}
    </section>
  );
}

function MetricTable({ title, rows, empty = "No measured data yet." }: { title: string; rows: RankedMetric[]; empty?: string }) {
  return (
    <section style={{ padding: "1rem", border: "1px solid rgba(201,162,39,.14)", borderRadius: ".8rem", background: "rgba(255,255,255,.02)" }}>
      <h2 style={{ color: "#f0d47a", fontSize: "1rem", marginTop: 0 }}>{title}</h2>
      {rows.length === 0 ? <p style={{ color: "rgba(237,232,220,.4)", fontSize: ".78rem" }}>{empty}</p> : (
        <div style={{ display: "grid", gap: ".45rem" }}>
          {rows.map((row) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", fontSize: ".78rem" }}>
              <span style={{ color: "rgba(237,232,220,.62)", overflowWrap: "anywhere" }}>{row.label}</span>
              <strong>{row.count}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default async function AdminGrowthPage() {
  try { await requireAdminSession(); } catch { redirect("/admin/login"); }

  const now = new Date();
  const [traffic24h, traffic7d, latestReport, recent] = await Promise.all([
    getTrafficSummary(new Date(now.getTime() - 86_400_000), now),
    getTrafficSummary(new Date(now.getTime() - 7 * 86_400_000), now),
    db.agentArtifact.findFirst({
      where: { agentName: "content-performance", artifactType: "DAILY_GROWTH_REPORT" },
      orderBy: { createdAt: "desc" },
      select: { payload: true, createdAt: true },
    }),
    db.agentArtifact.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      select: { id: true, agentName: true, artifactType: true, status: true, title: true, summary: true, createdAt: true },
    }),
  ]);
  const social = record(record(latestReport?.payload).social);
  const totals = record(social.totals);
  const delta = record(social.delta);
  const items = Array.isArray(social.items) ? social.items.map(record) : [];
  const emailDelivery = record(record(latestReport?.payload).emailDelivery);

  return (
    <main style={{ minHeight: "100vh", background: "#04000c", color: "#ede8dc", padding: "2rem" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontFamily: "Georgia,serif", color: "#f0d47a", margin: 0 }}>Traffic & Growth</h1>
            <p style={{ color: "rgba(237,232,220,.52)", fontSize: ".8rem" }}>Cookie-free daily sessions, minimized acquisition attribution and aggregate owned-social engagement.</p>
          </div>
          <Link href="/admin" style={{ color: "#c9a227" }}>Dashboard</Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: ".8rem", marginBottom: "1rem" }}>
          <StatCard label="Sessions · 24h" value={traffic24h.sessions} note={`${traffic7d.sessions} in 7 days`} />
          <StatCard label="Page views · 24h" value={traffic24h.pageViews} note={`${traffic7d.pageViews} in 7 days`} />
          <StatCard label="Link clicks · 24h" value={traffic24h.linkClicks} note={`${traffic24h.registrationClicks} registration clicks`} />
          <StatCard label="Social likes" value={Number(totals.likes || 0)} note={`+${Number(delta.likes || 0)} since prior report`} />
          <StatCard label="Comments" value={Number(totals.comments || 0)} note={`+${Number(delta.comments || 0)} since prior report`} />
          <StatCard label="Shares" value={Number(totals.shares || 0)} note={`+${Number(delta.shares || 0)} since prior report`} />
        </div>

        <p style={{ color: "rgba(237,232,220,.42)", fontSize: ".72rem", marginBottom: "1.2rem" }}>
          Daily report: {latestReport ? latestReport.createdAt.toISOString().slice(0, 16).replace("T", " ") + " UTC" : "not generated yet"} · email {String(emailDelivery.status || "pending")} · country groups under 5 sessions are suppressed.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: ".8rem", marginBottom: "1.2rem" }}>
          <MetricTable title="Traffic sources · 24h" rows={traffic24h.topSources} />
          <MetricTable title="Landing pages · 24h" rows={traffic24h.topLandingPages} />
          <MetricTable title="Countries · 7d" rows={traffic7d.topCountries} empty="Country header is not trusted/configured yet or groups are below the privacy threshold." />
          <MetricTable title="Languages · 7d" rows={traffic7d.topLocales} />
        </div>

        <section style={{ marginBottom: "1.2rem", padding: "1rem", border: "1px solid rgba(201,162,39,.14)", borderRadius: ".8rem", background: "rgba(255,255,255,.02)", overflowX: "auto" }}>
          <h2 style={{ color: "#f0d47a", fontSize: "1rem", marginTop: 0 }}>Owned social post engagement</h2>
          {items.length === 0 ? <p style={{ color: "rgba(237,232,220,.4)", fontSize: ".78rem" }}>The first scheduled daily report will populate this table.</p> : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".75rem" }}>
              <thead><tr>{["Provider", "Locale", "Likes", "Comments", "Shares", "Status", "Published"].map((label) => <th key={label} style={{ textAlign: "left", padding: ".5rem", color: "rgba(237,232,220,.4)" }}>{label}</th>)}</tr></thead>
              <tbody>{items.slice(0, 30).map((item, index) => {
                const metrics = record(item.metrics);
                return <tr key={`${String(item.provider)}-${String(item.externalId)}-${index}`} style={{ borderTop: "1px solid rgba(255,255,255,.05)" }}>
                  <td style={{ padding: ".55rem" }}>{String(item.provider || "—")}</td>
                  <td style={{ padding: ".55rem" }}>{String(item.locale || "—")}</td>
                  <td style={{ padding: ".55rem" }}>{Number(metrics.likes || 0)}</td>
                  <td style={{ padding: ".55rem" }}>{Number(metrics.comments || 0)}</td>
                  <td style={{ padding: ".55rem" }}>{Number(metrics.shares || 0)}</td>
                  <td style={{ padding: ".55rem" }}>{String(item.status || "—")}</td>
                  <td style={{ padding: ".55rem" }}>{String(item.publishedAt || "").slice(0, 10) || "—"}</td>
                </tr>;
              })}</tbody>
            </table>
          )}
        </section>

        <h2 style={{ color: "#f0d47a", fontSize: "1rem" }}>Recent growth outputs</h2>
        <div style={{ display: "grid", gap: ".6rem" }}>
          {recent.map((artifact) => (
            <section key={artifact.id} style={{ padding: ".85rem 1rem", border: "1px solid rgba(201,162,39,.12)", borderRadius: ".65rem", background: "rgba(255,255,255,.018)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}><strong>{artifact.title}</strong><span style={{ color: "#f0d47a", fontSize: ".7rem" }}>{artifact.status}</span></div>
              <p style={{ color: "rgba(237,232,220,.48)", fontSize: ".75rem", marginBottom: ".25rem" }}>{artifact.summary || "—"}</p>
              <small style={{ color: "rgba(237,232,220,.3)" }}>{artifact.agentName} · {artifact.artifactType} · {artifact.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC</small>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
