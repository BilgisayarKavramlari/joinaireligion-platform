import { getSyndicationEntries } from "@/lib/content-feed-data";
import { buildAtomFeed } from "@/lib/content-syndication";

export const dynamic = "force-dynamic";

export async function GET() {
  const body = buildAtomFeed(await getSyndicationEntries());
  return new Response(body, {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}

