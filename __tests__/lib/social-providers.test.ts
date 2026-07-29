const mockFetch = jest.fn();

jest.mock("@/lib/env", () => ({
  env: {
    SOCIAL_PUBLISHING_ENABLED: "true",
    MASTODON_BASE_URL: "https://mastoturk.org",
    MASTODON_ACCESS_TOKEN: "test-token",
    META_GRAPH_VERSION: "v25.0",
    META_PAGE_ID: "page-1",
    META_PAGE_ACCESS_TOKEN: "meta-test-token",
    INSTAGRAM_USER_ID: "instagram-1",
    FACEBOOK_PUBLISHING_ENABLED: "true",
    INSTAGRAM_PUBLISHING_ENABLED: "true",
  },
}));

import {
  SOCIAL_LOCALES,
  buildBlueskyFacets,
  contentLocaleFromText,
  publishSocialPost,
  selectProviderLocale,
  truncateBlueskyText,
  type SocialProviderName,
} from "@/lib/social/providers";
import { readSocialDeliveries } from "@/lib/growth-agents/runners";

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = mockFetch;
});

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

  it("selects deterministic provider-specific locales with low-volume seven-language coverage", () => {
    const providers: SocialProviderName[] = ["mastodon", "bluesky", "x", "linkedin", "facebook", "instagram"];
    const counts = Object.fromEntries(providers.map((provider) => [
      provider,
      Object.fromEntries(SOCIAL_LOCALES.map((locale) => [locale, 0])),
    ])) as Record<SocialProviderName, Record<(typeof SOCIAL_LOCALES)[number], number>>;

    for (const provider of providers) {
      expect(selectProviderLocale(provider, "determinism-check")).toBe(
        selectProviderLocale(provider, "determinism-check"),
      );
      for (let index = 0; index < 2_000; index += 1) {
        const seed = `artifact-${index}`;
        const locale = selectProviderLocale(provider, seed);
        if (locale) counts[provider][locale] += 1;
      }
      for (const locale of SOCIAL_LOCALES) expect(counts[provider][locale]).toBeGreaterThan(0);
    }

    expect(counts.mastodon.tr).toBeGreaterThan(counts.mastodon.en);
    expect(counts.bluesky.en).toBeGreaterThan(counts.bluesky.tr);
    expect(counts.x.en).toBeGreaterThan(counts.x.tr);
    expect(counts.linkedin.en).toBeGreaterThan(counts.linkedin.tr);
    expect(counts.facebook.en).toBeGreaterThan(counts.facebook.tr);
    expect(counts.instagram.en).toBeGreaterThan(counts.instagram.tr);
  });

  it("falls back to the highest-weight available locale", () => {
    expect(selectProviderLocale("mastodon", "stable-seed", ["en", "zh"])).toBe("en");
    expect(selectProviderLocale("bluesky", "stable-seed", ["tr", "zh"])).toBe("tr");
    expect(selectProviderLocale("x", "stable-seed", [])).toBeNull();
  });

  it("derives and sends the Mastodon language from the selected content URL", async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ id: "status-1", url: "https://mastoturk.org/@join/1" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    const text = "Düşünce\n\nhttps://joinaireligion.com/content/tr/ornek";

    expect(contentLocaleFromText(text)).toBe("tr");
    await publishSocialPost("mastodon", text, "stable-idempotency-key");

    const request = mockFetch.mock.calls[0][1] as RequestInit;
    const body = request.body as URLSearchParams;
    expect(body.get("language")).toBe("tr");
    expect((request.headers as Record<string, string>)["Idempotency-Key"]).toBe("stable-idempotency-key");
  });

  it("preserves locale and language-policy version in delivery audit records", () => {
    expect(readSocialDeliveries({
      deliveries: [{
        provider: "mastodon",
        status: "PUBLISHED",
        attemptedAt: "2026-07-29T12:00:00.000Z",
        locale: "tr",
        languagePolicyVersion: "v1",
        externalId: "status-1",
      }],
    })).toEqual([{
      provider: "mastodon",
      status: "PUBLISHED",
      attemptedAt: "2026-07-29T12:00:00.000Z",
      locale: "tr",
      languagePolicyVersion: "v1",
      externalId: "status-1",
    }]);
  });

  it("publishes a Facebook Page link post with the approved content URL", async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ id: "page-1_post-1" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));

    const result = await publishSocialPost(
      "facebook",
      "Read this reflection\n\nhttps://joinaireligion.com/content/en/reflection-example",
      "facebook-idempotency-key",
    );

    expect(result).toEqual({ provider: "facebook", externalId: "page-1_post-1", externalUrl: null });
    const [url, request] = mockFetch.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe("https://graph.facebook.com/v25.0/page-1/feed");
    const body = request.body as URLSearchParams;
    expect(body.get("link")).toBe("https://joinaireligion.com/content/en/reflection-example");
  });

  it("creates, waits for, and publishes an Instagram image container", async () => {
    mockFetch
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "container-1" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status_code: "FINISHED" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "media-1" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ permalink: "https://www.instagram.com/p/media-1/" }), { status: 200 }));

    const result = await publishSocialPost(
      "instagram",
      "A reflection\n\nhttps://joinaireligion.com/content/tr/ornek-yazi",
      "instagram-idempotency-key",
    );

    expect(result).toEqual({
      provider: "instagram",
      externalId: "media-1",
      externalUrl: "https://www.instagram.com/p/media-1/",
    });
    const createBody = mockFetch.mock.calls[0][1].body as URLSearchParams;
    expect(createBody.get("image_url")).toBe("https://joinaireligion.com/social-card/tr/ornek-yazi.png");
    expect(mockFetch.mock.calls[2][0].toString()).toBe("https://graph.facebook.com/v25.0/instagram-1/media_publish");
  });
});
