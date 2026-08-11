const mockFetch = jest.fn();

jest.mock("@/lib/env", () => ({
  env: {
    SOCIAL_PUBLISHING_ENABLED: "true",
    X_API_KEY: "x-api-key",
    X_API_SECRET: "x-api-secret",
    X_ACCESS_TOKEN: "x-access-token",
    X_ACCESS_TOKEN_SECRET: "x-access-token-secret",
    X_PUBLISHING_ENABLED: "true",
    LINKEDIN_ACCESS_TOKEN: "linkedin-test-token",
    LINKEDIN_AUTHOR_URN: "urn:li:organization:143125933",
    LINKEDIN_VERSION: "202607",
    LINKEDIN_PUBLISHING_ENABLED: "true",
    MASTODON_BASE_URL: "https://mastoturk.org",
    MASTODON_ACCESS_TOKEN: "test-token",
    META_GRAPH_VERSION: "v25.0",
    META_PAGE_ID: "page-1",
    META_PAGE_ACCESS_TOKEN: "meta-test-token",
    INSTAGRAM_USER_ID: "instagram-1",
    FACEBOOK_PUBLISHING_ENABLED: "true",
    INSTAGRAM_PUBLISHING_ENABLED: "true",
    THREADS_ACCESS_TOKEN: "threads-test-token",
    THREADS_PUBLISHING_ENABLED: "true",
    PINTEREST_ACCESS_TOKEN: "pinterest-test-token",
    PINTEREST_BOARD_ID: "123456789",
    PINTEREST_PUBLISHING_ENABLED: "true",
    PINTEREST_ACTIVATED_AT: "2026-07-29T12:00:00.000Z",
  },
}));

import {
  LINKEDIN_ORGANIZATION_AUTHOR_URN,
  SOCIAL_LOCALES,
  SocialPublicationOutcomeAmbiguousError,
  buildBlueskyFacets,
  contentLocaleFromText,
  getConfiguredSocialProviders,
  publishSocialPost,
  selectProviderLocale,
  shouldSkipSocialProviderForActivation,
  truncateBlueskyText,
  type SocialProviderName,
} from "@/lib/social/providers";
import { env } from "@/lib/env";
import {
  SOCIAL_MAX_DELIVERY_ATTEMPTS,
  isSocialDeliveryRetryDue,
  isSocialPackageStale,
  readSocialDeliveries,
} from "@/lib/growth-agents/runners";

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
    const providers: SocialProviderName[] = ["mastodon", "bluesky", "x", "linkedin", "facebook", "instagram", "threads", "pinterest"];
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
      if (provider !== "mastodon") {
        for (const locale of SOCIAL_LOCALES) expect(counts[provider][locale]).toBeGreaterThan(0);
      }
    }

    expect(counts.mastodon.tr).toBe(2_000);
    expect(counts.mastodon.en).toBe(0);
    expect(counts.bluesky.en).toBeGreaterThan(counts.bluesky.tr);
    expect(counts.x.en).toBeGreaterThan(counts.x.tr);
    expect(counts.linkedin.en).toBeGreaterThan(counts.linkedin.tr);
    expect(counts.facebook.en).toBeGreaterThan(counts.facebook.tr);
    expect(counts.instagram.en).toBeGreaterThan(counts.instagram.tr);
    expect(counts.instagram.tr).toBeGreaterThan(counts.instagram.es);
    expect(counts.threads.en).toBeGreaterThan(counts.threads.tr);
    expect(counts.pinterest.en).toBeGreaterThan(counts.pinterest.tr);
    expect(counts.pinterest.tr).toBeGreaterThan(counts.pinterest.es);
  });

  it("falls back to the highest-weight available locale", () => {
    expect(selectProviderLocale("mastodon", "stable-seed", ["en", "zh"])).toBeNull();
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

  it("preserves bounded retry metadata and evaluates retry windows", () => {
    const [delivery] = readSocialDeliveries({
      deliveries: [{
        provider: "instagram",
        status: "FAILED",
        attemptedAt: "2026-08-08T12:00:00.000Z",
        attemptCount: 2,
        nextRetryAt: "2026-08-08T18:00:00.000Z",
        error: "Instagram publication failed with HTTP 500",
      }],
    });

    expect(delivery.attemptCount).toBe(2);
    expect(SOCIAL_MAX_DELIVERY_ATTEMPTS).toBe(3);
    expect(isSocialDeliveryRetryDue(delivery, new Date("2026-08-08T17:59:59.999Z"))).toBe(false);
    expect(isSocialDeliveryRetryDue(delivery, new Date("2026-08-08T18:00:00.000Z"))).toBe(true);
  });

  it("preserves terminal ambiguity and never marks it retryable", () => {
    const [delivery] = readSocialDeliveries({
      deliveries: [{
        provider: "threads",
        status: "AMBIGUOUS",
        attemptedAt: "2026-08-11T09:00:00.000Z",
        attemptCount: 1,
        reason: "manual_reconciliation_required",
      }],
    });

    expect(delivery).toMatchObject({
      provider: "threads",
      status: "AMBIGUOUS",
      reason: "manual_reconciliation_required",
    });
    expect(isSocialDeliveryRetryDue(delivery, new Date("2026-08-12T09:00:00.000Z"))).toBe(false);
  });

  it("archives social packages only after the 72-hour freshness window", () => {
    const createdAt = new Date("2026-08-05T12:00:00.000Z");

    expect(isSocialPackageStale(createdAt, new Date("2026-08-08T12:00:00.000Z"))).toBe(false);
    expect(isSocialPackageStale(createdAt, new Date("2026-08-08T12:00:00.001Z"))).toBe(true);
  });

  it("fails closed when Pinterest activation time is missing or malformed", () => {
    const original = env.PINTEREST_ACTIVATED_AT;
    try {
      (env as { PINTEREST_ACTIVATED_AT?: string }).PINTEREST_ACTIVATED_AT = undefined;
      expect(getConfiguredSocialProviders()).not.toContain("pinterest");
      (env as { PINTEREST_ACTIVATED_AT?: string }).PINTEREST_ACTIVATED_AT = "2026-07-29";
      expect(getConfiguredSocialProviders()).not.toContain("pinterest");
    } finally {
      (env as { PINTEREST_ACTIVATED_AT?: string }).PINTEREST_ACTIVATED_AT = original;
    }
  });

  it("skips only Pinterest packages created before its activation watermark", () => {
    expect(shouldSkipSocialProviderForActivation("pinterest", new Date("2026-07-29T11:59:59.999Z"))).toBe(true);
    expect(shouldSkipSocialProviderForActivation("pinterest", new Date("2026-07-29T12:00:00.000Z"))).toBe(false);
    expect(shouldSkipSocialProviderForActivation("pinterest", new Date("2026-07-29T12:00:00.001Z"))).toBe(false);
    expect(shouldSkipSocialProviderForActivation("facebook", new Date("2020-01-01T00:00:00.000Z"))).toBe(false);
  });

  it("preserves activation skips as auditable completed delivery records", () => {
    expect(readSocialDeliveries({
      deliveries: [{
        provider: "pinterest",
        status: "SKIPPED",
        attemptedAt: "2026-07-29T12:00:00.000Z",
        languagePolicyVersion: "v2",
        reason: "before_provider_activation",
        activationAt: "2026-07-29T12:00:00.000Z",
      }],
    })).toEqual([{
      provider: "pinterest",
      status: "SKIPPED",
      attemptedAt: "2026-07-29T12:00:00.000Z",
      languagePolicyVersion: "v2",
      reason: "before_provider_activation",
      activationAt: "2026-07-29T12:00:00.000Z",
    }]);
  });

  it("blocks direct Pinterest publication when the activation watermark is absent", async () => {
    const original = env.PINTEREST_ACTIVATED_AT;
    try {
      (env as { PINTEREST_ACTIVATED_AT?: string }).PINTEREST_ACTIVATED_AT = undefined;
      await expect(publishSocialPost(
        "pinterest",
        "A careful reflection\n\nhttps://joinaireligion.com/content/en/reflection-example",
        "pinterest-no-watermark",
      )).rejects.toThrow("Pinterest publication is not fully configured");
      expect(mockFetch).not.toHaveBeenCalled();
    } finally {
      (env as { PINTEREST_ACTIVATED_AT?: string }).PINTEREST_ACTIVATED_AT = original;
    }
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

  it("signs X publication with OAuth 1.0a credentials generated for the owner account", async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ data: { id: "x-post-1" } }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    }));

    const result = await publishSocialPost(
      "x",
      "A reflection https://joinaireligion.com/content/en/reflection-example",
      "x-idempotency-key",
    );

    expect(result).toEqual({ provider: "x", externalId: "x-post-1", externalUrl: "https://x.com/i/web/status/x-post-1" });
    const [url, request] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.x.com/2/tweets");
    const authorization = (request.headers as Record<string, string>).Authorization;
    expect(authorization).toContain("OAuth oauth_consumer_key=\"x-api-key\"");
    expect(authorization).toContain("oauth_token=\"x-access-token\"");
    expect(authorization).not.toContain("x-api-secret");
    expect(authorization).not.toContain("x-access-token-secret");
  });

  it("publishes LinkedIn posts only as the fixed Join AI Religion organization", async () => {
    mockFetch.mockResolvedValue(new Response(null, {
      status: 201,
      headers: { "x-restli-id": "urn:li:share:linkedin-post-1" },
    }));

    const result = await publishSocialPost(
      "linkedin",
      "A reflection https://joinaireligion.com/content/en/reflection-example",
      "linkedin-idempotency-key",
    );

    expect(result).toEqual({
      provider: "linkedin",
      externalId: "urn:li:share:linkedin-post-1",
      externalUrl: "https://www.linkedin.com/feed/update/urn%3Ali%3Ashare%3Alinkedin-post-1/",
    });
    const [url, request] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.linkedin.com/rest/posts");
    expect(request.headers).toEqual(expect.objectContaining({
      Authorization: "Bearer linkedin-test-token",
      "Linkedin-Version": "202607",
      "X-Restli-Protocol-Version": "2.0.0",
    }));
    expect(JSON.parse(String(request.body))).toEqual(expect.objectContaining({
      author: LINKEDIN_ORGANIZATION_AUTHOR_URN,
      lifecycleState: "PUBLISHED",
      visibility: "PUBLIC",
    }));
  });

  it("fails closed before LinkedIn I/O when a member author URN is configured", async () => {
    const originalAuthor = env.LINKEDIN_AUTHOR_URN;
    try {
      (env as { LINKEDIN_AUTHOR_URN?: string }).LINKEDIN_AUTHOR_URN = "urn:li:person:123";
      expect(getConfiguredSocialProviders()).not.toContain("linkedin");
      await expect(publishSocialPost(
        "linkedin",
        "A reflection https://joinaireligion.com/content/en/reflection-example",
        "linkedin-member-author-block",
      )).rejects.toThrow("LinkedIn publication is not fully configured");
      expect(mockFetch).not.toHaveBeenCalled();
    } finally {
      (env as { LINKEDIN_AUTHOR_URN?: string }).LINKEDIN_AUTHOR_URN = originalAuthor;
    }
  });

  it("fails closed before LinkedIn I/O when its API version is malformed", async () => {
    const originalVersion = env.LINKEDIN_VERSION;
    try {
      (env as { LINKEDIN_VERSION?: string }).LINKEDIN_VERSION = "YYYYMM";
      expect(getConfiguredSocialProviders()).not.toContain("linkedin");
      await expect(publishSocialPost(
        "linkedin",
        "A reflection https://joinaireligion.com/content/en/reflection-example",
        "linkedin-version-block",
      )).rejects.toThrow("LinkedIn publication is not fully configured");
      expect(mockFetch).not.toHaveBeenCalled();
    } finally {
      (env as { LINKEDIN_VERSION?: string }).LINKEDIN_VERSION = originalVersion;
    }
  });

  it("marks an uncertain LinkedIn organization Post as terminal ambiguity", async () => {
    mockFetch.mockRejectedValueOnce(new Error("socket closed after dispatch"));

    await expect(publishSocialPost(
      "linkedin",
      "A reflection https://joinaireligion.com/content/en/reflection-example",
      "linkedin-ambiguous-key",
    )).rejects.toMatchObject({
      provider: "linkedin",
      stage: "post_create",
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("creates, waits for, and publishes an Instagram image container", async () => {
    mockFetch
      .mockResolvedValueOnce(new Response(new Uint8Array(2_048), { status: 200, headers: { "Content-Type": "image/jpeg" } }))
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
    expect(mockFetch.mock.calls[0][0]).toBe("https://joinaireligion.com/social-card/tr/ornek-yazi.jpg?preset=instagram");
    const createBody = mockFetch.mock.calls[1][1].body as URLSearchParams;
    expect(createBody.get("image_url")).toBe("https://joinaireligion.com/social-card/tr/ornek-yazi.jpg?preset=instagram");
    expect(mockFetch.mock.calls[3][0].toString()).toBe("https://graph.facebook.com/v25.0/instagram-1/media_publish");
  });

  it("preserves Unicode slugs when building an Instagram social card URL", async () => {
    mockFetch
      .mockResolvedValueOnce(new Response(new Uint8Array(2_048), { status: 200, headers: { "Content-Type": "image/jpeg" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "container-2" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status_code: "FINISHED" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "media-2" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ permalink: "https://www.instagram.com/p/media-2/" }), { status: 200 }));

    await publishSocialPost(
      "instagram",
      "Düşünce\n\nhttps://joinaireligion.com/content/tr/tanıdık-olmayan-geleneklere-saygılı-yaklaşmak",
      "instagram-unicode-idempotency-key",
    );

    const createBody = mockFetch.mock.calls[1][1].body as URLSearchParams;
    expect(createBody.get("image_url")).toBe(
      "https://joinaireligion.com/social-card/tr/tan%C4%B1d%C4%B1k-olmayan-geleneklere-sayg%C4%B1l%C4%B1-yakla%C5%9Fmak.jpg?preset=instagram",
    );
  });

  it("creates, waits for, and publishes a Threads text container", async () => {
    mockFetch
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "threads-container-1" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "threads-container-1", status: "FINISHED" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "threads-post-1" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ permalink: "https://www.threads.net/@join/post/example" }), { status: 200 }));

    const result = await publishSocialPost(
      "threads",
      "A reflection\n\nhttps://joinaireligion.com/content/en/reflection-example",
      "threads-idempotency-key",
    );

    expect(result).toEqual({
      provider: "threads",
      externalId: "threads-post-1",
      externalUrl: "https://www.threads.net/@join/post/example",
    });
    expect(mockFetch.mock.calls[0][0]).toBe("https://graph.threads.net/me/threads");
    const createBody = mockFetch.mock.calls[0][1].body as URLSearchParams;
    expect(createBody.get("media_type")).toBe("TEXT");
    expect(createBody.get("text")).toContain("https://joinaireligion.com/content/en/reflection-example");
    expect(mockFetch.mock.calls[2][0]).toBe("https://graph.threads.net/me/threads_publish");
  });

  it("marks an uncertain Threads publish as terminal ambiguity", async () => {
    mockFetch
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "threads-container-2" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "FINISHED" }), { status: 200 }))
      .mockRejectedValueOnce(new Error("socket closed after dispatch"));

    await expect(publishSocialPost(
      "threads",
      "A reflection\n\nhttps://joinaireligion.com/content/en/reflection-example",
      "threads-ambiguous-key",
    )).rejects.toBeInstanceOf(SocialPublicationOutcomeAmbiguousError);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("creates a Pinterest image Pin from the approved locale-specific social card", async () => {
    mockFetch
      .mockResolvedValueOnce(new Response(new Uint8Array(2_048), { status: 200, headers: { "Content-Type": "image/jpeg" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "pin-123" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }));

    const result = await publishSocialPost(
      "pinterest",
      "A careful reflection\n\nA concise summary for readers.\n\nhttps://joinaireligion.com/content/en/reflection-example",
      "pinterest-idempotency-key",
    );

    expect(result).toEqual({
      provider: "pinterest",
      externalId: "pin-123",
      externalUrl: "https://www.pinterest.com/pin/pin-123/",
    });
    expect(mockFetch.mock.calls[0][0]).toBe("https://joinaireligion.com/social-card/en/reflection-example.jpg?preset=pinterest");
    const [url, request] = mockFetch.mock.calls[1] as [string, RequestInit];
    expect(url).toBe("https://api.pinterest.com/v5/pins");
    expect((request.headers as Record<string, string>).Authorization).toBe("Bearer pinterest-test-token");
    const body = JSON.parse(String(request.body)) as Record<string, unknown>;
    expect(body.board_id).toBe("123456789");
    expect(body.link).toBe("https://joinaireligion.com/content/en/reflection-example");
    expect(body.media_source).toEqual({
      source_type: "image_url",
      url: "https://joinaireligion.com/social-card/en/reflection-example.jpg?preset=pinterest",
    });
  });

  it("marks an uncertain Pinterest create as terminal ambiguity", async () => {
    mockFetch
      .mockResolvedValueOnce(new Response(new Uint8Array(2_048), { status: 200, headers: { "Content-Type": "image/jpeg" } }))
      .mockRejectedValueOnce(new Error("socket closed after dispatch"));

    await expect(publishSocialPost(
      "pinterest",
      "A careful reflection\n\nA concise summary.\n\nhttps://joinaireligion.com/content/en/reflection-example",
      "pinterest-ambiguous-key",
    )).rejects.toBeInstanceOf(SocialPublicationOutcomeAmbiguousError);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
