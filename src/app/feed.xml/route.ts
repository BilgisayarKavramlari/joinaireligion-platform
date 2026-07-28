import { getSyndicationEntries } from "@/lib/content-feed-data";
import { buildRssFeed } from "@/lib/content-syndication";

export const dynamic = "force-dynamic";

export async function GET() {
  const body = buildRssFeed(await getSyndicationEntries());
  return new Response(body, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}

