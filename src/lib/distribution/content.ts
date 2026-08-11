import { contentInlineTokens, contentMarkdownBlocks } from "@/lib/content-markdown";
import { db } from "@/lib/db";
import type { DistributionArticle } from "@/lib/distribution/types";

const SITE_URL = "https://joinaireligion.com";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInline(value: string): string {
  return contentInlineTokens(value).map((token) => {
    if (token.type === "strong") return `<strong>${escapeHtml(token.text)}</strong>`;
    if (token.type === "emphasis") return `<em>${escapeHtml(token.text)}</em>`;
    if (token.type === "link") return `<a href="${escapeHtml(token.href)}" rel="noopener noreferrer">${escapeHtml(token.text)}</a>`;
    return escapeHtml(token.text);
  }).join("");
}

export function distributionMarkdownToHtml(value: string): string {
  return contentMarkdownBlocks(value).map((block) => {
    if (block.type === "heading") return `<h${block.level}>${renderInline(block.text)}</h${block.level}>`;
    if (block.type === "paragraph") return `<p>${renderInline(block.text)}</p>`;
    if (block.type === "quote") return `<blockquote><p>${renderInline(block.text)}</p></blockquote>`;
    if (block.type === "rule") return "<hr>";
    const tag = block.ordered ? "ol" : "ul";
    return `<${tag}>${block.items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</${tag}>`;
  }).join("\n");
}

export function distributionMarkdownToPlainText(value: string): string {
  return contentMarkdownBlocks(value).flatMap((block) => {
    if (block.type === "rule") return [];
    if (block.type === "list") return block.items;
    return [block.text];
  }).join("\n\n");
}

export function distributionSlug(article: Pick<DistributionArticle, "canonicalUrl">): string {
  return new URL(article.canonicalUrl).pathname.split("/").filter(Boolean).at(-1) || "article";
}

export async function getDistributionArticle(locale: string, slug: string): Promise<DistributionArticle | null> {
  const variant = await db.contentVariant.findUnique({
    where: { locale_slug: { locale, slug } },
    include: { contentItem: { select: { status: true, category: true, fingerprint: true, publishedAt: true } } },
  });
  if (!variant || variant.contentItem.status !== "PUBLISHED" || !variant.publishedAt) return null;
  return {
    idempotencyKey: `${variant.contentItem.fingerprint}:${variant.locale}:${variant.updatedAt.toISOString()}`,
    title: variant.title,
    summary: variant.summary,
    bodyMarkdown: variant.bodyMarkdown,
    canonicalUrl: `${SITE_URL}/content/${variant.locale}/${variant.slug}`,
    locale: variant.locale,
    category: variant.contentItem.category,
    tags: [variant.contentItem.category.replaceAll("_", "-"), "responsible-ai", "reflection"],
    author: "Join AI Religion Editorial",
    imageUrl: `${SITE_URL}/social-card/${variant.locale}/${variant.slug}.jpg?preset=discover`,
    publishedAt: variant.publishedAt ?? variant.contentItem.publishedAt ?? variant.createdAt,
    updatedAt: variant.updatedAt,
    aiAssisted: true,
  };
}
