import { buildAtomFeed, buildJsonFeed, buildRssFeed, type SyndicationEntry } from "@/lib/content-syndication";

const entry: SyndicationEntry = {
  title: "Meaning & Attention <Practice>",
  summary: "A safe multilingual reflection & introduction.",
  url: "https://joinaireligion.com/content/en/meaning-attention",
  locale: "en",
  category: "REFLECTION",
  publishedAt: new Date("2026-07-28T12:00:00.000Z"),
  updatedAt: new Date("2026-07-28T13:00:00.000Z"),
};

describe("content syndication feeds", () => {
  test("builds valid-looking RSS with escaped content and autodiscovery identity", () => {
    const value = buildRssFeed([entry], new Date("2026-07-28T14:00:00.000Z"));
    expect(value).toContain("<rss version=\"2.0\"");
    expect(value).toContain("Meaning &amp; Attention &lt;Practice&gt;");
    expect(value).toContain("https://joinaireligion.com/feed.xml");
    expect(value).toContain("<dc:language>en</dc:language>");
  });

  test("builds Atom entries with stable canonical ids", () => {
    const value = buildAtomFeed([entry], new Date("2026-07-28T14:00:00.000Z"));
    expect(value).toContain("<feed xmlns=\"http://www.w3.org/2005/Atom\">");
    expect(value).toContain("<id>https://joinaireligion.com/content/en/meaning-attention</id>");
    expect(value).toContain("xml:lang=\"en\"");
  });

  test("builds JSON Feed 1.1", () => {
    const value = JSON.parse(buildJsonFeed([entry]));
    expect(value.version).toBe("https://jsonfeed.org/version/1.1");
    expect(value.items).toHaveLength(1);
    expect(value.items[0].language).toBe("en");
  });
});

