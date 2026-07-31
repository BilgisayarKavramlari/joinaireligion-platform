import { buildVideoRss, buildVideoSitemap, toIsoDuration } from "@/lib/video";

const episode = {
  id: "video-1", guid: "joinai-video-1", title: "Attention & Meaning", summary: "A safe reflection",
  articleUrl: "https://joinaireligion.com/content/en/example", videoUrl: "https://joinaireligion.com/uploads/video/reflection-1.mp4",
  thumbnailUrl: "https://joinaireligion.com/visuals/reflective-video-cover.jpg", videoBytes: 123_456,
  durationSeconds: 184.4, publishedAt: new Date("2026-07-31T12:00:00Z"), locale: "en",
};

describe("video syndication", () => {
  it("emits Media RSS with valid public media metadata and disclosure", () => {
    const xml = buildVideoRss([episode], new Date("2026-07-31T13:00:00Z"));
    expect(xml).toContain('xmlns:media="http://search.yahoo.com/mrss/"');
    expect(xml).toContain('type="video/mp4"');
    expect(xml).toContain('duration="184"');
    expect(xml).toContain("Attention &amp; Meaning");
    expect(xml).toContain("AI-assisted");
  });

  it("emits a Google video sitemap and ISO duration", () => {
    const xml = buildVideoSitemap([episode]);
    expect(xml).toContain('xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"');
    expect(xml).toContain("<video:content_loc>https://joinaireligion.com/uploads/video/reflection-1.mp4</video:content_loc>");
    expect(toIsoDuration(184.4)).toBe("PT184S");
  });
});
