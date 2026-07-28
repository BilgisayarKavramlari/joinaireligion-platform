import { db } from "@/lib/db";
import type { SyndicationEntry } from "@/lib/content-syndication";

const SITE_URL = "https://joinaireligion.com";

export async function getSyndicationEntries(): Promise<SyndicationEntry[]> {
  const items = await db.contentItem.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: 50,
    include: { variants: { where: { publishedAt: { not: null } } } },
  });

  return items.flatMap((item) =>
    item.variants.map((variant) => ({
      title: variant.title,
      summary: variant.summary,
      url: `${SITE_URL}/content/${variant.locale}/${variant.slug}`,
      locale: variant.locale,
      category: item.category,
      publishedAt: variant.publishedAt ?? item.publishedAt ?? variant.createdAt,
      updatedAt: variant.updatedAt,
    }))
  );
}

