export type VideoEpisode = {
  id: string;
  guid: string;
  title: string;
  summary: string;
  articleUrl: string;
  videoUrl: string;
  thumbnailUrl: string;
  videoBytes: number;
  durationSeconds: number;
  publishedAt: Date;
  locale: string;
};

const SITE_URL = "https://joinaireligion.com";

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export function toIsoDuration(seconds: number): string {
  return `PT${Math.max(1, Math.round(seconds))}S`;
}

export function buildVideoRss(episodes: VideoEpisode[], generatedAt = new Date()): string {
  const items = episodes.map((episode) => `    <item>
      <title>${escapeXml(episode.title)}</title>
      <link>${SITE_URL}/videos/${escapeXml(episode.id)}</link>
      <guid isPermaLink="false">${escapeXml(episode.guid)}</guid>
      <description>${escapeXml(`${episode.summary} Visual and voice are AI-assisted.`)}</description>
      <pubDate>${episode.publishedAt.toUTCString()}</pubDate>
      <media:content url="${escapeXml(episode.videoUrl)}" fileSize="${episode.videoBytes}" type="video/mp4" medium="video" duration="${Math.round(episode.durationSeconds)}" width="1280" height="720">
        <media:title type="plain">${escapeXml(episode.title)}</media:title>
        <media:description type="plain">${escapeXml(episode.summary)}</media:description>
        <media:thumbnail url="${escapeXml(episode.thumbnailUrl)}" width="1200" height="675" />
        <media:player url="${SITE_URL}/videos/${escapeXml(episode.id)}" />
        <media:rating scheme="urn:simple">nonadult</media:rating>
      </media:content>
    </item>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Join AI Religion — Reflective Video</title>
    <link>${SITE_URL}/videos</link>
    <description>Short educational video editions of reviewed reflections. Visuals and voices are AI-assisted.</description>
    <language>en</language>
    <lastBuildDate>${generatedAt.toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/video.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}

export function buildVideoSitemap(episodes: VideoEpisode[]): string {
  const items = episodes.map((episode) => `  <url>
    <loc>${SITE_URL}/videos/${escapeXml(episode.id)}</loc>
    <video:video>
      <video:thumbnail_loc>${escapeXml(episode.thumbnailUrl)}</video:thumbnail_loc>
      <video:title>${escapeXml(episode.title)}</video:title>
      <video:description>${escapeXml(episode.summary)}</video:description>
      <video:content_loc>${escapeXml(episode.videoUrl)}</video:content_loc>
      <video:duration>${Math.round(episode.durationSeconds)}</video:duration>
      <video:publication_date>${episode.publishedAt.toISOString()}</video:publication_date>
      <video:family_friendly>yes</video:family_friendly>
    </video:video>
  </url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${items}
</urlset>
`;
}
