export const dynamic = "force-dynamic";

import { getVideoEpisodes } from "@/lib/video-data";
import { buildVideoSitemap } from "@/lib/video";

export async function GET(): Promise<Response> {
  return new Response(buildVideoSitemap(await getVideoEpisodes()), { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300, s-maxage=900" } });
}
