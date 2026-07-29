"use client";

import React from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { publicUpdates, resolvePublicUpdateLocale } from "@/lib/public-updates";

const ui = {
  en: {
    eyebrow: "PRODUCT CHANGELOG",
    title: "Updates",
    intro: "Short, clear notes about what is coming and what has been released.",
    planned: "Planned",
    released: "Released",
    notice: "Target dates are estimates. A release is marked as released only after tests, review, deployment, and live verification pass.",
    back: "Back to home",
  },
  tr: {
    eyebrow: "ÜRÜN DEĞİŞİKLİK GÜNLÜĞÜ",
    title: "Güncellemeler",
    intro: "Planlanan ve yayınlanan yenilikleri kısa ve anlaşılır notlarla takip edin.",
    planned: "Planlandı",
    released: "Yayınlandı",
    notice: "Hedef tarihler tahminidir. Bir sürüm ancak test, inceleme, dağıtım ve canlı doğrulama tamamlandıktan sonra yayınlandı olarak işaretlenir.",
    back: "Ana sayfaya dön",
  },
} as const;

export default function UpdatesContent() {
  const { lang } = useLanguage();
  const locale = resolvePublicUpdateLocale(lang);
  const labels = ui[locale];

  return (
    <main
      style={{
        minHeight: "calc(100vh - 72px)",
        padding: "5rem 1.5rem 7rem",
        background:
          "radial-gradient(circle at 15% 0%, rgba(20,184,166,.12), transparent 32%), radial-gradient(circle at 85% 10%, rgba(107,33,168,.12), transparent 35%), var(--bg-base)",
      }}
    >
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <p style={{ color: "var(--gold)", fontSize: ".68rem", letterSpacing: ".24em", marginBottom: ".8rem" }}>
          {labels.eyebrow}
        </p>
        <h1 className="font-sacred" style={{ color: "var(--gold-light)", fontSize: "clamp(2.2rem, 7vw, 4rem)", lineHeight: 1.05 }}>
          {labels.title}
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "1rem", lineHeight: 1.7, maxWidth: 620, margin: "1rem 0 2.5rem" }}>
          {labels.intro}
        </p>

        <section aria-label={labels.title} style={{ display: "grid", gap: "1.2rem" }}>
          {publicUpdates.map((update) => {
            const copy = update.copy[locale];
            const statusLabel = update.status === "released" ? labels.released : labels.planned;
            const dateLabel = update.status === "released"
              ? update.releasedAt
              : update.targetWindow?.[locale];

            return (
              <article
                key={update.version}
                style={{
                  border: "1px solid var(--border-gold)",
                  borderRadius: "1rem",
                  background: "rgba(10,5,24,.72)",
                  padding: "clamp(1.25rem, 4vw, 2rem)",
                  boxShadow: "0 24px 70px rgba(0,0,0,.28)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: ".65rem", flexWrap: "wrap" }}>
                    <strong style={{ color: "var(--gold-light)", fontSize: "1rem" }}>{update.version}</strong>
                    <span
                      style={{
                        border: "1px solid rgba(20,184,166,.4)",
                        borderRadius: "999px",
                        padding: ".22rem .6rem",
                        color: "#8de9df",
                        background: "rgba(20,184,166,.08)",
                        fontSize: ".7rem",
                      }}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  {dateLabel && (
                    <time dateTime={update.releasedAt ?? update.targetStart} style={{ color: "var(--text-muted)", fontSize: ".78rem" }}>
                      {dateLabel}
                    </time>
                  )}
                </div>

                <h2 className="font-sacred" style={{ color: "var(--text-primary)", fontSize: "1.45rem", margin: "1.3rem 0 .6rem" }}>
                  {copy.title}
                </h2>
                <p style={{ color: "var(--text-muted)", lineHeight: 1.7, marginBottom: "1rem" }}>{copy.summary}</p>
                <ul style={{ color: "var(--text-primary)", lineHeight: 1.65, paddingLeft: "1.2rem", margin: 0 }}>
                  {copy.highlights.map((highlight) => <li key={highlight} style={{ marginBottom: ".45rem" }}>{highlight}</li>)}
                </ul>
              </article>
            );
          })}
        </section>

        <p style={{ color: "var(--text-muted)", fontSize: ".78rem", lineHeight: 1.6, margin: "1.5rem 0" }}>
          {labels.notice}
        </p>
        <Link href="/" style={{ color: "var(--gold-light)", textDecoration: "none", fontSize: ".82rem" }}>
          ← {labels.back}
        </Link>
      </div>
    </main>
  );
}
