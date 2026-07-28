import { getSyndicationEntries } from "@/lib/content-feed-data";
import { buildJsonFeed } from "@/lib/content-syndication";

export const dynamic = "force-dynamic";

export async function GET() {
  const body = buildJsonFeed(await getSyndicationEntries());
  return new Response(body, {
    headers: {
      "Content-Type": "application/feed+json; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}

