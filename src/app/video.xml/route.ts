export const dynamic = "force-dynamic";

import { getVideoEpisodes } from "@/lib/video-data";
import { buildVideoRss } from "@/lib/video";

export async function GET(): Promise<Response> {
  return new Response(buildVideoRss(await getVideoEpisodes()), { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=86400" } });
}
