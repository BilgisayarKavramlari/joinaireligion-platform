export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentEngagement } from "@/components/content/ContentEngagement";
import { ContentRichText } from "@/components/content/ContentRichText";
import { decodeContentRouteSegment } from "@/lib/content-routing";
import { db } from "@/lib/db";
import { SUPPORTED_CONTENT_LOCALES, type SupportedContentLocale } from "@/lib/growth-agents/content";
import { getContentCopy } from "@/lib/content-copy";
import { getTopicClusterForCategory } from "@/lib/content-topics";

type PageProps = { params: Promise<{ locale: string; slug: string }> };

async function getVariant(locale: string, slug: string) {
  const decodedLocale = decodeContentRouteSegment(locale);
  const decodedSlug = decodeContentRouteSegment(slug);
  if (!SUPPORTED_CONTENT_LOCALES.includes(decodedLocale as SupportedContentLocale)) return null;
  return db.contentVariant.findUnique({
    where: { locale_slug: { locale: decodedLocale, slug: decodedSlug } },
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
  const canonical = `https://joinaireligion.com/content/${variant.locale}/${variant.slug}`;
  const socialImage = `https://joinaireligion.com/social-card/${variant.locale}/${variant.slug}?preset=discover`;
  const languages = Object.fromEntries(variant.contentItem.variants.map((item) => [item.locale, `https://joinaireligion.com/content/${item.locale}/${item.slug}`]));
  return {
    title: variant.seoTitle,
    description: variant.seoDescription,
    alternates: { canonical, languages },
    openGraph: { title: variant.seoTitle, description: variant.seoDescription, type: "article", url: canonical, images: [{ url: socialImage, width: 1200, height: 675 }] },
    twitter: { card: "summary_large_image", title: variant.seoTitle, description: variant.seoDescription, images: [socialImage] },
  };
}

export default async function ContentDetailPage({ params }: PageProps) {
  const { locale, slug } = await params;
  const variant = await getVariant(locale, slug);
  if (!variant || variant.contentItem.status !== "PUBLISHED" || !variant.publishedAt) notFound();
  const faq = parseFaq(variant.faqBlocks);
  const copy = getContentCopy(variant.locale);
  const totals = await db.contentFeedbackMetric.aggregate({ where: { contentItemId: variant.contentItemId }, _sum: { likes: true } });
  const canonical = `https://joinaireligion.com/content/${variant.locale}/${variant.slug}`;
  const discoverImage = `https://joinaireligion.com/social-card/${variant.locale}/${variant.slug}?preset=discover`;
  const topicCluster = getTopicClusterForCategory(variant.contentItem.category);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: variant.title,
    description: variant.summary,
    inLanguage: variant.locale,
    datePublished: variant.publishedAt.toISOString(),
    dateModified: variant.updatedAt.toISOString(),
    mainEntityOfPage: canonical,
    image: [discoverImage],
    isAccessibleForFree: true,
    about: topicCluster ? { "@type": "Thing", name: topicCluster.title, url: `https://joinaireligion.com/content/topics/${topicCluster.slug}` } : undefined,
    author: { "@type": "Organization", name: "Join AI Religion" },
    publisher: { "@type": "Organization", name: "Join AI Religion", url: "https://joinaireligion.com" },
  };
  const faqData = faq.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) } : null;

  return (
    <main style={{ minHeight: "100vh", padding: "3.5rem 1.5rem 6rem", background: "radial-gradient(circle at 20% 0%, rgba(20,184,166,.1), transparent 35%), var(--bg-base)" }}>
      <article lang={variant.locale} dir={variant.locale === "ar" ? "rtl" : "ltr"} style={{ maxWidth: 780, margin: "0 auto" }}>
        <Link href="/content" style={{ color: "var(--gold)", textDecoration: "none" }}>← {copy.allInsights}</Link>
        <p style={{ marginTop: "2rem", color: "var(--gold)", fontSize: ".65rem", letterSpacing: ".2em", textTransform: "uppercase" }}>{variant.contentItem.category} · {variant.locale.toUpperCase()}</p>
        {topicCluster && <Link href={`/content/topics/${topicCluster.slug}`} className="topic-cluster-entry">{topicCluster.title} →</Link>}
        <h1 className="font-sacred" style={{ color: "var(--gold-light)", fontSize: "clamp(2rem,7vw,4rem)", lineHeight: 1.12 }}>{variant.title}</h1>
        <p style={{ fontSize: "1.08rem", lineHeight: 1.75, color: "rgba(237,232,220,.62)" }}>{variant.summary}</p>
        <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap", margin: "1.2rem 0 2rem" }}>
          {variant.contentItem.variants.map((item) => <Link key={item.id} href={`/content/${item.locale}/${item.slug}`} style={{ color: item.locale === variant.locale ? "#04000c" : "var(--gold-light)", background: item.locale === variant.locale ? "var(--gold)" : "transparent", border: "1px solid var(--border-gold)", borderRadius: ".35rem", padding: ".25rem .5rem", fontSize: ".7rem", textDecoration: "none" }}>{item.locale.toUpperCase()}</Link>)}
        </div>
        <ContentRichText markdown={variant.bodyMarkdown} />
        {faq.length > 0 && <section style={{ marginTop: "2.5rem" }}><h2 className="font-sacred" style={{ color: "var(--gold-light)" }}>{copy.questions}</h2>{faq.map((item) => <details key={item.question} style={{ borderTop: "1px solid var(--border-gold)", padding: ".8rem 0" }}><summary style={{ cursor: "pointer", color: "var(--text-primary)" }}>{item.question}</summary><p style={{ color: "rgba(237,232,220,.65)", lineHeight: 1.7 }}>{item.answer}</p></details>)}</section>}
        <ContentEngagement contentItemId={variant.contentItemId} locale={variant.locale} initialLikes={totals._sum.likes || 0} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
        {faqData && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqData).replace(/</g, "\\u003c") }} />}
      </article>
    </main>
  );
}
