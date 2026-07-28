export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/components/PublicHeader";
import { ContentEngagement } from "@/components/content/ContentEngagement";
import { db } from "@/lib/db";
import { SUPPORTED_CONTENT_LOCALES, type SupportedContentLocale } from "@/lib/growth-agents/content";

type PageProps = { params: Promise<{ locale: string; slug: string }> };

async function getVariant(locale: string, slug: string) {
  if (!SUPPORTED_CONTENT_LOCALES.includes(locale as SupportedContentLocale)) return null;
  return db.contentVariant.findUnique({
    where: { locale_slug: { locale, slug } },
    include: { contentItem: { include: { variants: true } } },
  });
}

function parseFaq(value: unknown): Array<{ question: string; answer: string }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    return typeof record.question === "string" && typeof record.answer === "string"
      ? [{ question: record.question, answer: record.answer }]
      : [];
  }).slice(0, 6);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const variant = await getVariant(locale, slug);
  if (!variant || variant.contentItem.status !== "PUBLISHED" || !variant.publishedAt) return {};
  const canonical = `https://joinaireligion.com/content/${locale}/${slug}`;
  const languages = Object.fromEntries(variant.contentItem.variants.map((item) => [item.locale, `https://joinaireligion.com/content/${item.locale}/${item.slug}`]));
  return {
    title: variant.seoTitle,
    description: variant.seoDescription,
    alternates: { canonical, languages },
    openGraph: { title: variant.seoTitle, description: variant.seoDescription, type: "article", url: canonical },
  };
}

function renderMarkdown(markdown: string) {
  return markdown.split(/\n{2,}/).map((block, index) => {
    const text = block.trim();
    if (!text) return null;
    if (text.startsWith("## ")) return <h2 key={index} className="font-sacred" style={{ color: "var(--gold-light)", marginTop: "2rem" }}>{text.slice(3)}</h2>;
    if (text.startsWith("# ")) return <h2 key={index} className="font-sacred" style={{ color: "var(--gold-light)" }}>{text.slice(2)}</h2>;
    return <p key={index} style={{ lineHeight: 1.9, color: "rgba(237,232,220,.78)" }}>{text}</p>;
  });
}

export default async function ContentDetailPage({ params }: PageProps) {
  const { locale, slug } = await params;
  const variant = await getVariant(locale, slug);
  if (!variant || variant.contentItem.status !== "PUBLISHED" || !variant.publishedAt) notFound();
  const faq = parseFaq(variant.faqBlocks);
  const totals = await db.contentFeedbackMetric.aggregate({ where: { contentItemId: variant.contentItemId }, _sum: { likes: true } });
  const canonical = `https://joinaireligion.com/content/${locale}/${slug}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: variant.title,
    description: variant.summary,
    inLanguage: locale,
    datePublished: variant.publishedAt.toISOString(),
    dateModified: variant.updatedAt.toISOString(),
    mainEntityOfPage: canonical,
    author: { "@type": "Organization", name: "Join AI Religion" },
    publisher: { "@type": "Organization", name: "Join AI Religion", url: "https://joinaireligion.com" },
  };
  const faqData = faq.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) } : null;

  return (
    <><PublicHeader /><main style={{ minHeight: "100vh", padding: "3.5rem 1.5rem 6rem", background: "radial-gradient(circle at 20% 0%, rgba(20,184,166,.1), transparent 35%), var(--bg-base)" }}>
      <article style={{ maxWidth: 780, margin: "0 auto" }}>
        <Link href="/content" style={{ color: "var(--gold)", textDecoration: "none" }}>← All insights</Link>
        <p style={{ marginTop: "2rem", color: "var(--gold)", fontSize: ".65rem", letterSpacing: ".2em", textTransform: "uppercase" }}>{variant.contentItem.category} · {locale.toUpperCase()}</p>
        <h1 className="font-sacred" style={{ color: "var(--gold-light)", fontSize: "clamp(2rem,7vw,4rem)", lineHeight: 1.12 }}>{variant.title}</h1>
        <p style={{ fontSize: "1.08rem", lineHeight: 1.75, color: "rgba(237,232,220,.62)" }}>{variant.summary}</p>
        <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap", margin: "1.2rem 0 2rem" }}>
          {variant.contentItem.variants.map((item) => <Link key={item.id} href={`/content/${item.locale}/${item.slug}`} style={{ color: item.locale === locale ? "#04000c" : "var(--gold-light)", background: item.locale === locale ? "var(--gold)" : "transparent", border: "1px solid var(--border-gold)", borderRadius: ".35rem", padding: ".25rem .5rem", fontSize: ".7rem", textDecoration: "none" }}>{item.locale.toUpperCase()}</Link>)}
        </div>
        <section>{renderMarkdown(variant.bodyMarkdown)}</section>
        {faq.length > 0 && <section style={{ marginTop: "2.5rem" }}><h2 className="font-sacred" style={{ color: "var(--gold-light)" }}>Questions</h2>{faq.map((item) => <details key={item.question} style={{ borderTop: "1px solid var(--border-gold)", padding: ".8rem 0" }}><summary style={{ cursor: "pointer", color: "var(--text-primary)" }}>{item.question}</summary><p style={{ color: "rgba(237,232,220,.65)", lineHeight: 1.7 }}>{item.answer}</p></details>)}</section>}
        <ContentEngagement contentItemId={variant.contentItemId} locale={locale} initialLikes={totals._sum.likes || 0} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
        {faqData && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqData).replace(/</g, "\\u003c") }} />}
      </article>
    </main></>
  );
}
