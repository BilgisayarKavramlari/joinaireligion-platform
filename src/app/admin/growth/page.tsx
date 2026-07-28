export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";

export default async function AdminGrowthPage() {
  try { await requireAdminSession(); } catch { redirect("/admin/login"); }

  const [drafts, ready, recent] = await Promise.all([
    db.agentArtifact.count({ where: { status: "DRAFT" } }),
    db.agentArtifact.count({ where: { status: "READY" } }),
    db.agentArtifact.findMany({
      take: 30,
      orderBy: { createdAt: "desc" },
      select: { id: true, agentName: true, artifactType: true, status: true, title: true, summary: true, riskLevel: true, qualityScore: true, createdAt: true },
    }),
  ]);

  return (
    <main style={{ minHeight: "100vh", background: "#04000c", color: "#ede8dc", padding: "2rem" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ fontFamily: "Georgia,serif", color: "#f0d47a", margin: 0 }}>Growth Agent Outputs</h1>
            <p style={{ color: "rgba(237,232,220,.5)", fontSize: ".8rem" }}>Reports and drafts only. Spend, publication and financial writes are disabled.</p>
          </div>
          <Link href="/admin" style={{ color: "#c9a227" }}>Dashboard</Link>
        </div>
        <p style={{ color: "rgba(237,232,220,.55)" }}>{drafts} draft · {ready} ready report</p>
        <div style={{ display: "grid", gap: ".75rem" }}>
          {recent.map((artifact) => (
            <section key={artifact.id} style={{ padding: "1rem", border: "1px solid rgba(201,162,39,.14)", borderRadius: ".7rem", background: "rgba(255,255,255,.02)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                <strong>{artifact.title}</strong>
                <span style={{ color: "#f0d47a", fontSize: ".72rem" }}>{artifact.status}</span>
              </div>
              <p style={{ color: "rgba(237,232,220,.5)", fontSize: ".78rem" }}>{artifact.summary || "—"}</p>
              <small style={{ color: "rgba(237,232,220,.35)" }}>{artifact.agentName} · {artifact.artifactType} · risk {artifact.riskLevel} · quality {artifact.qualityScore ?? "—"} · {artifact.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC</small>
            </section>
          ))}
          {recent.length === 0 && <p style={{ color: "rgba(237,232,220,.45)" }}>No growth artifacts yet.</p>}
        </div>
      </div>
    </main>
  );
}
