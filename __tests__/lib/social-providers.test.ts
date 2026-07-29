import { buildBlueskyFacets, truncateBlueskyText } from "@/lib/social/providers";

describe("Bluesky social provider helpers", () => {
  it("truncates copy to 300 grapheme clusters without splitting emoji", () => {
    const text = `${"a".repeat(299)}👨‍👩‍👧‍👦tail`;

    expect(truncateBlueskyText(text)).toBe(`${"a".repeat(299)}👨‍👩‍👧‍👦`);
  });

  it("builds UTF-8 byte offsets for clickable links", () => {
    const text = "Düşünce: https://joinaireligion.com/content/tr/ornek.";

    expect(buildBlueskyFacets(text)).toEqual([{
      index: { byteStart: 12, byteEnd: 55 },
      features: [{
        $type: "app.bsky.richtext.facet#link",
        uri: "https://joinaireligion.com/content/tr/ornek",
      }],
    }]);
  });
});
