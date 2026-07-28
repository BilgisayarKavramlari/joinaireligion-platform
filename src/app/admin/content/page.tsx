export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";

export default async function AdminContentPage() {
  try { await requireAdminSession(); } catch { redirect("/admin/login"); }

  const [published, drafts, quarantined, rejected, unpublished, recent] = await Promise.all([
    db.contentItem.count({ where: { status: "PUBLISHED" } }),
    db.contentItem.count({ where: { status: "DRAFT" } }),
    db.contentItem.count({ where: { status: "QUARANTINED" } }),
    db.contentItem.count({ where: { status: "REJECTED" } }),
    db.contentItem.count({ where: { status: "UNPUBLISHED" } }),
    db.contentItem.findMany({
      take: 25,
      orderBy: { createdAt: "desc" },
      include: {
        variants: { select: { locale: true, title: true, slug: true, qualityScore: true, publishedAt: true }, orderBy: { locale: "asc" } },
        moderationDecisions: { take: 1, orderBy: { createdAt: "desc" }, select: { outcome: true, riskLevel: true } },
      },
    }),
  ]);

  return (
    <main style={{ minHeight: "100vh", background: "#04000c", color: "#ede8dc", padding: "2rem" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ fontFamily: "Georgia,serif", color: "#f0d47a", margin: 0 }}>Autonomous Content</h1>
            <p style={{ color: "rgba(237,232,220,.5)", fontSize: ".8rem" }}>Producer → independent publisher → anonymous performance feedback. All state changes are auditable and reversible.</p>
          </div>
          <Link href="/admin" style={{ color: "#c9a227" }}>Dashboard</Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: ".75rem", marginBottom: "1.5rem" }}>
          {[["Published", published], ["Draft", drafts], ["Quarantined", quarantined], ["Rejected", rejected], ["Unpublished", unpublished]].map(([label, value]) => (
            <div key={label} style={{ padding: "1rem", border: "1px solid rgba(201,162,39,.18)", borderRadius: ".7rem", background: "rgba(255,255,255,.03)" }}>
              <div style={{ color: "rgba(237,232,220,.45)", fontSize: ".7rem" }}>{label}</div>
              <div style={{ color: "#f0d47a", fontSize: "1.7rem" }}>{value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gap: ".75rem" }}>
          {recent.map((item) => (
            <section key={item.id} style={{ padding: "1rem", border: "1px solid rgba(201,162,39,.14)", borderRadius: ".7rem", background: "rgba(255,255,255,.02)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                <strong>{item.canonicalTopic}</strong>
                <span style={{ color: item.status === "REJECTED" ? "#ff9da7" : "#f0d47a", fontSize: ".72rem" }}>{item.status}</span>
              </div>
              <p style={{ color: "rgba(237,232,220,.45)", fontSize: ".72rem" }}>{item.category} · {item.contentType} · {item.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC</p>
              <p style={{ color: "rgba(237,232,220,.55)", fontSize: ".72rem" }}>
                Metrics: {typeof item.aggregateMetrics === "object" && item.aggregateMetrics && "views" in item.aggregateMetrics ? Number(item.aggregateMetrics.views || 0) : 0} views · {typeof item.aggregateMetrics === "object" && item.aggregateMetrics && "likes" in item.aggregateMetrics ? Number(item.aggregateMetrics.likes || 0) : 0} useful · engagement {typeof item.aggregateMetrics === "object" && item.aggregateMetrics && "engagementScore" in item.aggregateMetrics ? Number(item.aggregateMetrics.engagementScore || 0) : 0}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: ".45rem" }}>
                {item.variants.map((variant) => (
                  variant.publishedAt
                    ? <Link key={variant.locale} href={`/content/${variant.locale}/${variant.slug}`} title={variant.title} style={{ padding: ".25rem .5rem", background: "rgba(201,162,39,.12)", borderRadius: ".35rem", fontSize: ".72rem", color: "#f0d47a" }}>{variant.locale.toUpperCase()} · {variant.qualityScore ?? "—"}</Link>
                    : <span key={variant.locale} title={variant.title} style={{ padding: ".25rem .5rem", background: "rgba(201,162,39,.08)", borderRadius: ".35rem", fontSize: ".72rem" }}>{variant.locale.toUpperCase()} · {variant.qualityScore ?? "—"}</span>
                ))}
                {item.moderationDecisions[0] && <span style={{ fontSize: ".72rem", color: "rgba(237,232,220,.55)" }}>Gate: {item.moderationDecisions[0].outcome} / {item.moderationDecisions[0].riskLevel}</span>}
              </div>
            </section>
          ))}
          {recent.length === 0 && <p style={{ color: "rgba(237,232,220,.45)" }}>No content items yet.</p>}
        </div>
      </div>
    </main>
  );
}
