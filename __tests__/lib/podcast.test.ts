import { buildPodcastRss, buildPodcastScript, stripMarkdownForSpeech } from "@/lib/podcast";

describe("podcast syndication", () => {
  it("turns reviewed markdown into bounded speech with disclosure", () => {
    const script = buildPodcastScript({ title: "A title", summary: "A summary", bodyMarkdown: "## Heading\n\n**Calm** [link](https://example.com)." });
    expect(script).toContain("AI-generated voice");
    expect(script).toContain("Heading Calm link");
    expect(script.length).toBeLessThanOrEqual(4_000);
    expect(stripMarkdownForSpeech("**hello**")).toBe("hello");
  });

  it("emits Apple-compatible enclosure metadata and stable disclosure", () => {
    const xml = buildPodcastRss([{
      guid: "episode-1",
      title: "Attention & Meaning",
      summary: "A safe reflection",
      articleUrl: "https://joinaireligion.com/content/en/example",
      audioUrl: "https://joinaireligion.com/uploads/podcast/episode-1.mp3",
      audioBytes: 12345,
      publishedAt: new Date("2026-07-30T12:00:00Z"),
      locale: "en",
    }], new Date("2026-07-30T13:00:00Z"));
    expect(xml).toContain('xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"');
    expect(xml).toContain('length="12345" type="audio/mpeg"');
    expect(xml).toContain("AI-generated voice");
    expect(xml).toContain("Attention &amp; Meaning");
  });
});
