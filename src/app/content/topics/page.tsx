export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { TopicClusterCards } from "@/components/content/TopicClusterCards";
import { TOPIC_CLUSTERS } from "@/lib/content-topics";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Topic Clusters | Join AI Religion",
  description: "Connected multilingual reflections on meaning, attention, reflective practice, cross-cultural literacy, and responsible AI.",
  alternates: { canonical: "https://joinaireligion.com/content/topics" },
};

export default async function TopicClustersPage() {
  const counts = await db.contentItem.groupBy({
    by: ["category"],
    where: { status: "PUBLISHED" },
    _count: { _all: true },
  });
  const countByCategory = new Map(counts.map((entry) => [entry.category, entry._count._all]));
  const clusters = TOPIC_CLUSTERS.map((cluster) => ({
    slug: cluster.slug,
    title: cluster.title,
    description: cluster.description,
    count: cluster.categories.reduce((sum, category) => sum + (countByCategory.get(category) ?? 0), 0),
  }));
  return <TopicClusterCards clusters={clusters} />;
}
