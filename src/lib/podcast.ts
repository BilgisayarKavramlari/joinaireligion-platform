export type PodcastEpisode = {
  guid: string;
  title: string;
  summary: string;
  articleUrl: string;
  audioUrl: string;
  audioBytes: number;
  publishedAt: Date;
  locale: string;
};

const SITE_URL = "https://joinaireligion.com";
const SHOW_TITLE = "Join AI Religion — Reflective Audio";
const SHOW_DESCRIPTION = "Short, AI-voiced educational reflections on attention, meaning, values, and responsible AI. This is a fictional educational simulation, not a religion or professional advice.";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function stripMarkdownForSpeech(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/[*_~`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildPodcastScript(input: { title: string; summary: string; bodyMarkdown: string }): string {
  const disclosure = "This episode uses an AI-generated voice. ";
  const closing = " Join AI Religion is a fictional educational reflective simulation, not a religion, therapy, or professional advice.";
  const body = stripMarkdownForSpeech(input.bodyMarkdown);
  const prefix = `${disclosure}${input.title}. ${input.summary}. `;
  const available = Math.max(0, 4_000 - prefix.length - closing.length);
  return `${prefix}${body.slice(0, available)}${closing}`;
}

export function buildPodcastRss(episodes: PodcastEpisode[], generatedAt = new Date()): string {
  const items = episodes.map((episode) => `    <item>
      <title>${escapeXml(episode.title)}</title>
      <link>${escapeXml(episode.articleUrl)}</link>
      <guid isPermaLink="false">${escapeXml(episode.guid)}</guid>
      <description>${escapeXml(`${episode.summary} This episode uses an AI-generated voice.`)}</description>
      <pubDate>${episode.publishedAt.toUTCString()}</pubDate>
      <enclosure url="${escapeXml(episode.audioUrl)}" length="${episode.audioBytes}" type="audio/mpeg" />
      <itunes:author>Join AI Religion</itunes:author>
      <itunes:explicit>false</itunes:explicit>
      <itunes:episodeType>full</itunes:episodeType>
      <itunes:image href="${SITE_URL}/visuals/reflective-audio-cover.jpg" />
      <podcast:transcript url="${escapeXml(episode.articleUrl)}" type="text/html" language="${escapeXml(episode.locale)}" />
    </item>`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:podcast="https://podcastindex.org/namespace/1.0">
  <channel>
    <title>${escapeXml(SHOW_TITLE)}</title>
    <link>${SITE_URL}/podcast</link>
    <description>${escapeXml(SHOW_DESCRIPTION)}</description>
    <language>en</language>
    <lastBuildDate>${generatedAt.toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/podcast.xml" rel="self" type="application/rss+xml" />
    <itunes:author>Join AI Religion</itunes:author>
    <itunes:summary>${escapeXml(SHOW_DESCRIPTION)}</itunes:summary>
    <itunes:type>episodic</itunes:type>
    <itunes:explicit>false</itunes:explicit>
    <itunes:category text="Education"><itunes:category text="Self-Improvement" /></itunes:category>
    <itunes:image href="${SITE_URL}/visuals/reflective-audio-cover.jpg" />
    <itunes:owner><itunes:name>Join AI Religion</itunes:name><itunes:email>joinaireligion@sadievrenseker.com</itunes:email></itunes:owner>
    <image><url>${SITE_URL}/visuals/reflective-audio-cover.jpg</url><title>${escapeXml(SHOW_TITLE)}</title><link>${SITE_URL}/podcast</link></image>
${items}
  </channel>
</rss>
`;
}
