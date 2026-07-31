export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopicClusterArticles } from "@/components/content/TopicClusterCards";
import { getTopicCluster } from "@/lib/content-topics";
import { db } from "@/lib/db";

type PageProps = { params: Promise<{ cluster: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const cluster = getTopicCluster((await params).cluster);
  if (!cluster) return {};
  return {
    title: `${cluster.title} | Join AI Religion`,
    description: cluster.description,
    alternates: { canonical: `https://joinaireligion.com/content/topics/${cluster.slug}` },
    openGraph: { title: cluster.title, description: cluster.description, type: "website", url: `https://joinaireligion.com/content/topics/${cluster.slug}` },
  };
}

export default async function TopicClusterPage({ params }: PageProps) {
  const cluster = getTopicCluster((await params).cluster);
  if (!cluster) notFound();
  const items = await db.contentItem.findMany({
    where: { status: "PUBLISHED", category: { in: [...cluster.categories] } },
    orderBy: { publishedAt: "desc" },
    include: { variants: { orderBy: { locale: "asc" } } },
  });
  return <TopicClusterArticles cluster={cluster} items={items.map((item) => ({ id: item.id, category: item.category, variants: item.variants }))} />;
}
