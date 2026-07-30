export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import ContentIndex from "@/components/content/ContentIndex";
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

  return <ContentIndex items={items.map((item) => ({
    id: item.id,
    category: item.category,
    contentType: item.contentType,
    views: item.feedbackMetrics.reduce((sum, metric) => sum + metric.views, 0),
    likes: item.feedbackMetrics.reduce((sum, metric) => sum + metric.likes, 0),
    variants: item.variants.map((variant) => ({ id: variant.id, locale: variant.locale, slug: variant.slug, title: variant.title, summary: variant.summary })),
  }))} />;
}
