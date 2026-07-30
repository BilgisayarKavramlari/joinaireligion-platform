"use client";

import Link from "next/link";

import { useLanguage } from "@/contexts/LanguageContext";
import { getContentCopy } from "@/lib/content-copy";

type ContentIndexItem = {
  id: string;
  category: string;
  contentType: string;
  views: number;
  likes: number;
  variants: Array<{ id: string; locale: string; slug: string; title: string; summary: string }>;
};

export default function ContentIndex({ items }: { items: ContentIndexItem[] }) {
  const { lang } = useLanguage();
  const copy = getContentCopy(lang);

  return (
    <main style={{ minHeight: "100vh", padding: "4rem 1.5rem 6rem", background: "radial-gradient(circle at 50% 0%, rgba(107,33,168,.16), transparent 42%), var(--bg-base)" }}>
      <div style={{ maxWidth: 1050, margin: "0 auto" }}>
        <p style={{ color: "var(--gold)", letterSpacing: ".32em", textTransform: "uppercase", fontSize: ".7rem" }}>{copy.label}</p>
        <h1 className="font-sacred" style={{ color: "var(--gold-light)", fontSize: "clamp(2.1rem,6vw,4.4rem)", margin: ".4rem 0" }}>{copy.title}</h1>
        <p style={{ maxWidth: 720, color: "rgba(237,232,220,.62)", lineHeight: 1.8 }}>{copy.intro}</p>
        <div style={{ display: "grid", gap: "1rem", marginTop: "2.5rem" }}>
          {items.map((item) => {
            const primary = item.variants.find((variant) => variant.locale === lang)
              || item.variants.find((variant) => variant.locale === "en")
              || item.variants[0];
            if (!primary) return null;
            return (
              <article key={item.id} className="sacred-card" style={{ padding: "1.4rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                  <div>
                    <p style={{ color: "var(--gold)", fontSize: ".65rem", textTransform: "uppercase", letterSpacing: ".18em" }}>{item.category.replaceAll("_", " ")} · {item.contentType.replaceAll("_", " ")}</p>
                    <h2 className="font-sacred" style={{ margin: ".35rem 0", color: "var(--text-primary)" }}><Link href={`/content/${primary.locale}/${primary.slug}`} style={{ color: "inherit", textDecoration: "none" }}>{primary.title}</Link></h2>
                    <p style={{ color: "rgba(237,232,220,.58)", lineHeight: 1.65 }}>{primary.summary}</p>
                  </div>
                  <small style={{ color: "var(--text-muted)" }}>{item.views} {copy.views} · {item.likes} {copy.useful}</small>
                </div>
                <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap", marginTop: ".8rem" }}>
                  {item.variants.map((variant) => <Link key={variant.id} href={`/content/${variant.locale}/${variant.slug}`} style={{ color: "var(--gold-light)", border: "1px solid var(--border-gold)", borderRadius: ".35rem", padding: ".2rem .45rem", fontSize: ".68rem", textDecoration: "none" }}>{variant.locale.toUpperCase()}</Link>)}
                </div>
              </article>
            );
          })}
          {items.length === 0 && <p style={{ color: "var(--text-muted)" }}>{copy.empty}</p>}
        </div>
      </div>
    </main>
  );
}
