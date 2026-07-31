export const dynamic = "force-dynamic";

import { getPodcastEpisodes } from "@/lib/podcast-data";
import { buildPodcastRss } from "@/lib/podcast";

export async function GET(): Promise<Response> {
  const episodes = await getPodcastEpisodes();
  return new Response(buildPodcastRss(episodes), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=86400",
    },
  });
}
