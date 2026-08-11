export type SyndicationEntry = {
  title: string;
  summary: string;
  url: string;
  author: string;
  imageUrl: string;
  locale: string;
  category: string;
  publishedAt: Date;
  updatedAt: Date;
};

const SITE_URL = "https://joinaireligion.com";
const FEED_TITLE = "Join AI Religion — Insights & Reflections";
const FEED_DESCRIPTION =
  "Multilingual fictional educational reflections on meaning, attention, values, and responsible AI-guided inquiry.";

export function buildSyndicationSummary(summary: string, bodyMarkdown: string): string {
  const plainBody = bodyMarkdown
    .replace(/\[([^\]]+)\]\(https?:\/\/[^)\s]+\)/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/^>\s?/gm, "")
    .replace(/^[-*]\s+/gm, "")
    .replace(/^\d+[.)]\s+/gm, "")
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const normalizedSummary = summary.replace(/\s+/g, " ").trim();
  if (normalizedSummary.length >= 300) return Array.from(normalizedSummary).slice(0, 700).join("");
  const bodyWithoutDuplicateLead = plainBody.startsWith(normalizedSummary)
    ? plainBody.slice(normalizedSummary.length).trim()
    : plainBody;
  return Array.from(`${normalizedSummary} ${bodyWithoutDuplicateLead}`.trim()).slice(0, 700).join("");
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildRssFeed(entries: SyndicationEntry[], generatedAt = new Date()): string {
  const items = entries.map((entry) => `    <item>
      <title>${escapeXml(entry.title)}</title>
      <link>${escapeXml(entry.url)}</link>
      <guid isPermaLink="true">${escapeXml(entry.url)}</guid>
      <description>${escapeXml(entry.summary)}</description>
      <dc:creator>${escapeXml(entry.author)}</dc:creator>
      <category>${escapeXml(entry.category)}</category>
      <dc:language>${escapeXml(entry.locale)}</dc:language>
      <media:content url="${escapeXml(entry.imageUrl)}" medium="image" type="image/jpeg" />
      <enclosure url="${escapeXml(entry.imageUrl)}" length="0" type="image/jpeg" />
      <pubDate>${entry.publishedAt.toUTCString()}</pubDate>
    </item>`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${SITE_URL}/content</link>
    <description>${escapeXml(FEED_DESCRIPTION)}</description>
    <language>en</language>
    <lastBuildDate>${generatedAt.toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}

export function buildAtomFeed(entries: SyndicationEntry[], generatedAt = new Date()): string {
  const items = entries.map((entry) => `  <entry xml:lang="${escapeXml(entry.locale)}">
    <title>${escapeXml(entry.title)}</title>
    <id>${escapeXml(entry.url)}</id>
    <link href="${escapeXml(entry.url)}" rel="alternate" />
    <published>${entry.publishedAt.toISOString()}</published>
    <updated>${entry.updatedAt.toISOString()}</updated>
    <category term="${escapeXml(entry.category)}" />
    <summary>${escapeXml(entry.summary)}</summary>
    <author><name>${escapeXml(entry.author)}</name></author>
  </entry>`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(FEED_TITLE)}</title>
  <id>${SITE_URL}/content</id>
  <link href="${SITE_URL}/content" rel="alternate" />
  <link href="${SITE_URL}/atom.xml" rel="self" type="application/atom+xml" />
  <updated>${generatedAt.toISOString()}</updated>
  <subtitle>${escapeXml(FEED_DESCRIPTION)}</subtitle>
${items}
</feed>
`;
}

export function buildJsonFeed(entries: SyndicationEntry[]): string {
  return JSON.stringify({
    version: "https://jsonfeed.org/version/1.1",
    title: FEED_TITLE,
    home_page_url: `${SITE_URL}/content`,
    feed_url: `${SITE_URL}/feed.json`,
    description: FEED_DESCRIPTION,
    language: "en",
    authors: [{ name: "Join AI Religion", url: SITE_URL }],
    items: entries.map((entry) => ({
      id: entry.url,
      url: entry.url,
      title: entry.title,
      summary: entry.summary,
      image: entry.imageUrl,
      authors: [{ name: entry.author }],
      date_published: entry.publishedAt.toISOString(),
      date_modified: entry.updatedAt.toISOString(),
      language: entry.locale,
      tags: [entry.category],
    })),
  });
}
