export const dynamic = "force-dynamic";

import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { TOPIC_CLUSTERS } from "@/lib/content-topics";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://joinaireligion.com";
  const items = await db.contentItem.findMany({ where: { status: "PUBLISHED" }, include: { variants: true } });
  const staticEntries: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/content`, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/content/topics`, changeFrequency: "weekly", priority: 0.8 },
    ...TOPIC_CLUSTERS.map((cluster) => ({ url: `${baseUrl}/content/topics/${cluster.slug}`, changeFrequency: "weekly" as const, priority: 0.75 })),
    { url: `${baseUrl}/pricing`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/companion`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/podcast`, changeFrequency: "weekly", priority: 0.75 },
    { url: `${baseUrl}/videos`, changeFrequency: "weekly", priority: 0.75 },
    { url: `${baseUrl}/meaning-map`, changeFrequency: "monthly", priority: 0.85 },
    { url: `${baseUrl}/donate`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/updates`, changeFrequency: "weekly", priority: 0.5 },
  ];
  const contentEntries = items.flatMap((item) => {
    const languages = Object.fromEntries(item.variants.map((variant) => [variant.locale, `${baseUrl}/content/${variant.locale}/${variant.slug}`]));
    return item.variants.map((variant) => ({
      url: `${baseUrl}/content/${variant.locale}/${variant.slug}`,
      lastModified: variant.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
      alternates: { languages },
      images: [`${baseUrl}/social-card/${variant.locale}/${variant.slug}?preset=discover`],
    }));
  });
  return [...staticEntries, ...contentEntries];
}
