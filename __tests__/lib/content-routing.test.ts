import { decodeContentRouteSegment } from "@/lib/content-routing";

describe("content route decoding", () => {
  it("decodes URL-encoded Cyrillic and Han slugs", () => {
    const russian = "медитация-как-практика";
    const chinese = "冥想作为跨文化的注意力练习";

    expect(decodeContentRouteSegment(encodeURIComponent(russian))).toBe(russian);
    expect(decodeContentRouteSegment(encodeURIComponent(chinese))).toBe(chinese);
  });

  it("leaves already-decoded and malformed route segments usable", () => {
    expect(decodeContentRouteSegment("plain-ascii-slug")).toBe("plain-ascii-slug");
    expect(decodeContentRouteSegment("broken-%-slug")).toBe("broken-%-slug");
  });
});
