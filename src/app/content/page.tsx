export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Insights | Join AI Religion",
  description: "Multilingual fictional educational reflections on meaning, attention, values, and responsible AI-guided inquiry.",
  alternates: {
    canonical: "https://joinaireligion.com/content",
    types: {
      "application/rss+xml": "https://joinaireligion.com/feed.xml",
      "application/atom+xml": "https://joinaireligion.com/atom.xml",
      "application/feed+json": "https://joinaireligion.com/feed.json",
    },
  },
};

export default async function ContentIndexPage() {
  const items = await db.contentItem.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: 50,
    include: { variants: { orderBy: { locale: "asc" } }, feedbackMetrics: { select: { likes: true, views: true } } },
  });

  return (
    <main style={{ minHeight: "100vh", padding: "4rem 1.5rem 6rem", background: "radial-gradient(circle at 50% 0%, rgba(107,33,168,.16), transparent 42%), var(--bg-base)" }}>
      <div style={{ maxWidth: 1050, margin: "0 auto" }}>
        <p style={{ color: "var(--gold)", letterSpacing: ".32em", textTransform: "uppercase", fontSize: ".7rem" }}>Living Külliyat</p>
        <h1 className="font-sacred" style={{ color: "var(--gold-light)", fontSize: "clamp(2.1rem,6vw,4.4rem)", margin: ".4rem 0" }}>Insights & Reflections</h1>
        <p style={{ maxWidth: 720, color: "rgba(237,232,220,.62)", lineHeight: 1.8 }}>Automatically researched, independently reviewed, multilingual educational reflections. Every published item passes the platform’s quality and safety gates.</p>
        <div style={{ display: "grid", gap: "1rem", marginTop: "2.5rem" }}>
          {items.map((item) => {
            const primary = item.variants.find((variant) => variant.locale === "en") || item.variants[0];
            const likes = item.feedbackMetrics.reduce((sum, metric) => sum + metric.likes, 0);
            const views = item.feedbackMetrics.reduce((sum, metric) => sum + metric.views, 0);
            if (!primary) return null;
            return (
              <article key={item.id} className="sacred-card" style={{ padding: "1.4rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                  <div>
                    <p style={{ color: "var(--gold)", fontSize: ".65rem", textTransform: "uppercase", letterSpacing: ".18em" }}>{item.category} · {item.contentType}</p>
                    <h2 className="font-sacred" style={{ margin: ".35rem 0", color: "var(--text-primary)" }}><Link href={`/content/${primary.locale}/${primary.slug}`} style={{ color: "inherit", textDecoration: "none" }}>{primary.title}</Link></h2>
                    <p style={{ color: "rgba(237,232,220,.58)", lineHeight: 1.65 }}>{primary.summary}</p>
                  </div>
                  <small style={{ color: "var(--text-muted)" }}>{views} views · {likes} useful</small>
                </div>
                <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap", marginTop: ".8rem" }}>
                  {item.variants.map((variant) => <Link key={variant.id} href={`/content/${variant.locale}/${variant.slug}`} style={{ color: "var(--gold-light)", border: "1px solid var(--border-gold)", borderRadius: ".35rem", padding: ".2rem .45rem", fontSize: ".68rem", textDecoration: "none" }}>{variant.locale.toUpperCase()}</Link>)}
                </div>
              </article>
            );
          })}
          {items.length === 0 && <p style={{ color: "var(--text-muted)" }}>The first independently reviewed reflection is being prepared.</p>}
        </div>
      </div>
    </main>
  );
}
