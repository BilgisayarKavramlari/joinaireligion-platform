import { buildAppleNewsArticle, buildAppleNewsMultipart, createAppleNewsAuthorization, publishAppleNewsArticle } from "@/lib/distribution/apple-news";
import { distributionMarkdownToHtml, getDistributionArticle } from "@/lib/distribution/content";
import {
  createGhostAdminToken,
  createOAuth1Authorization,
  publishBloggerArticle,
  publishDevArticle,
  publishGhostArticle,
  publishHashnodeArticle,
  publishLemmyArticle,
  publishLineBroadcast,
  publishTumblrArticle,
} from "@/lib/distribution/http-providers";
import { buildUnsignedNostrArticle, publishNostrArticle, type NostrSigner, type SignedNostrEvent } from "@/lib/distribution/nostr";
import { assertDistributionProviderEnabled, distributionProviderReadiness } from "@/lib/distribution/providers";
import { assertDistributionArticle, type DistributionArticle } from "@/lib/distribution/types";
import { buildWikiText, publishFandomArticle, publishMediaWikiArticle } from "@/lib/distribution/wiki";

jest.mock("@/lib/db", () => ({
  db: { contentVariant: { findUnique: jest.fn() } },
}));

const article: DistributionArticle = {
  idempotencyKey: "reflection:en:2026-08-10",
  title: "Responsible AI and Attention",
  summary: "A practical reflection on attention, agency, and responsible AI use.",
  bodyMarkdown: "## Notice what changes\n\nUse **care** and [read the source](https://example.com).\n\n- Pause\n- Reflect",
  canonicalUrl: "https://joinaireligion.com/content/en/responsible-ai-attention",
  locale: "en",
  category: "responsible_ai",
  tags: ["responsible-ai", "reflection"],
  author: "Join AI Religion Editorial",
  imageUrl: "https://joinaireligion.com/social-card/en/responsible-ai-attention.jpg?preset=discover",
  publishedAt: new Date("2026-08-10T10:00:00.000Z"),
  updatedAt: new Date("2026-08-10T11:00:00.000Z"),
  aiAssisted: true,
};

function jsonResponse(data: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...headers } });
}

describe("open distribution content contract", () => {
  test("accepts only public canonical content and owned image assets", () => {
    expect(() => assertDistributionArticle(article)).not.toThrow();
    expect(() => assertDistributionArticle({ ...article, canonicalUrl: "https://example.com/content/en/x" })).toThrow(/canonical URL/);
    expect(() => assertDistributionArticle({ ...article, imageUrl: "https://tracker.example/image.jpg" })).toThrow(/image URL/);
  });

  test("renders the supported Markdown subset without executing HTML", () => {
    const html = distributionMarkdownToHtml(`${article.bodyMarkdown}\n\n<script>alert(1)</script>`);
    expect(html).toContain("<strong>care</strong>");
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>");
  });

  test("loads only published localized content", async () => {
    const { db } = jest.requireMock("@/lib/db") as { db: { contentVariant: { findUnique: jest.Mock } } };
    db.contentVariant.findUnique.mockResolvedValueOnce({
      id: "variant-1",
      title: article.title,
      summary: article.summary,
      bodyMarkdown: article.bodyMarkdown,
      locale: "en",
      slug: "responsible-ai-attention",
      publishedAt: article.publishedAt,
      createdAt: article.publishedAt,
      updatedAt: article.updatedAt,
      contentItem: { status: "PUBLISHED", category: "responsible_ai", fingerprint: "fp-1", publishedAt: article.publishedAt },
    });
    await expect(getDistributionArticle("en", "responsible-ai-attention")).resolves.toMatchObject({
      canonicalUrl: article.canonicalUrl,
      aiAssisted: true,
    });
  });
});

describe("HTTP long-form provider adapters", () => {
  test("publishes a canonical, disclosed DEV article", async () => {
    const fetchMock = jest.fn(async () => jsonResponse({ id: 42, url: "https://dev.to/joinai/example" })) as unknown as typeof fetch;
    await expect(publishDevArticle(article, { apiKey: "secret" }, fetchMock)).resolves.toEqual({
      provider: "dev", externalId: "42", externalUrl: "https://dev.to/joinai/example",
    });
    const [, init] = (fetchMock as jest.Mock).mock.calls[0];
    const payload = JSON.parse(String(init.body));
    expect(payload.article.canonical_url).toBe(article.canonicalUrl);
    expect(payload.article.body_markdown).toContain("AI assistance");
    expect(init.headers["api-key"]).toBe("secret");
  });

  test("publishes safe HTML through Blogger OAuth", async () => {
    const fetchMock = jest.fn(async () => jsonResponse({ id: "b1", url: "https://joinai.blogspot.com/p1" })) as unknown as typeof fetch;
    await publishBloggerArticle(article, { accessToken: "token", blogId: "123" }, fetchMock);
    const [url, init] = (fetchMock as jest.Mock).mock.calls[0];
    expect(String(url)).toContain("/blogs/123/posts?isDraft=false");
    const payload = JSON.parse(String(init.body));
    expect(payload.content).toContain("<h2>Notice what changes</h2>");
    expect(payload.content).toContain(article.canonicalUrl);
  });

  test("refreshes Blogger OAuth access without exposing the refresh token to the post endpoint", async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "short-lived-access" }))
      .mockResolvedValueOnce(jsonResponse({ id: "b2", url: "https://joinai.blogspot.com/p2" })) as unknown as typeof fetch;
    await publishBloggerArticle(article, {
      blogId: "123",
      clientId: "client",
      clientSecret: "client-secret",
      refreshToken: "refresh-secret",
    }, fetchMock);
    expect(String((fetchMock as jest.Mock).mock.calls[0][0])).toBe("https://oauth2.googleapis.com/token");
    expect((fetchMock as jest.Mock).mock.calls[1][1].headers.Authorization).toBe("Bearer short-lived-access");
    expect(JSON.stringify((fetchMock as jest.Mock).mock.calls[1])).not.toContain("refresh-secret");
  });

  test("publishes Tumblr NPF blocks with an original-source link", async () => {
    const fetchMock = jest.fn(async () => jsonResponse({ response: { id_string: "t1", post_url: "https://joinai.tumblr.com/post/t1" } })) as unknown as typeof fetch;
    const result = await publishTumblrArticle(article, {
      consumerKey: "consumer",
      consumerSecret: "consumer-secret",
      accessToken: "token",
      tokenSecret: "token-secret",
      blogIdentifier: "joinai.tumblr.com",
    }, fetchMock);
    expect(result.externalId).toBe("t1");
    const payload = JSON.parse(String((fetchMock as jest.Mock).mock.calls[0][1].body));
    expect(payload.content.at(-1)).toMatchObject({ type: "link", url: article.canonicalUrl });
    expect((fetchMock as jest.Mock).mock.calls[0][1].headers.Authorization).toMatch(/^OAuth /);
    const deterministic = createOAuth1Authorization({
      method: "POST",
      url: "https://api.tumblr.com/v2/blog/joinai.tumblr.com/posts",
      consumerKey: "consumer",
      consumerSecret: "consumer-secret",
      accessToken: "token",
      tokenSecret: "token-secret",
      nonce: "nonce",
      timestamp: 1_786_354_800,
    });
    expect(deterministic).toContain('oauth_signature_method="HMAC-SHA1"');
    expect(deterministic).not.toContain("consumer-secret");
  });

  test("uses Hashnode's current PublishPostInput and canonical source", async () => {
    const fetchMock = jest.fn(async () => jsonResponse({ data: { publishPost: { post: { id: "h1", url: "https://joinai.hashnode.dev/p1" } } } })) as unknown as typeof fetch;
    await publishHashnodeArticle(article, { personalAccessToken: "pat", publicationId: "pub" }, fetchMock);
    const payload = JSON.parse(String((fetchMock as jest.Mock).mock.calls[0][1].body));
    expect(payload.variables.input).toMatchObject({ publicationId: "pub", originalArticleURL: article.canonicalUrl, coverImage: article.imageUrl });
    expect(payload.variables.input.coverImageOptions).toBeUndefined();
  });

  test("creates a short-lived Ghost JWT and canonical post", async () => {
    const key = `key-id:${"ab".repeat(32)}`;
    const token = createGhostAdminToken(key, new Date("2026-08-10T10:00:00.000Z"));
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    expect(payload.exp - payload.iat).toBe(300);
    expect(token).not.toContain("key-id:");
    const fetchMock = jest.fn(async () => jsonResponse({ posts: [{ id: "g1", url: "https://ghost.example/p1" }] })) as unknown as typeof fetch;
    await publishGhostArticle(article, { adminUrl: "https://ghost.example", adminApiKey: key }, fetchMock);
    const body = JSON.parse(String((fetchMock as jest.Mock).mock.calls[0][1].body));
    expect(body.posts[0].canonical_url).toBe(article.canonicalUrl);
  });

  test("uses LINE broadcast only with a stable retry key", async () => {
    await expect(publishLineBroadcast(article, { channelAccessToken: "token", retryKey: "bad" }, jest.fn() as never)).rejects.toThrow(/UUID/);
    const fetchMock = jest.fn(async () => jsonResponse({}, 409, { "x-line-accepted-request-id": "accepted-1" })) as unknown as typeof fetch;
    const result = await publishLineBroadcast(article, { channelAccessToken: "token", retryKey: "123e4567-e89b-12d3-a456-426614174000" }, fetchMock);
    expect(result.externalId).toBe("accepted-1");
    expect(String((fetchMock as jest.Mock).mock.calls[0][0])).toContain("/broadcast");
  });

  test("blocks Lemmy community spraying and permits an explicitly approved community", async () => {
    const config = { instanceUrl: "https://lemmy.example", accessToken: "token", communityId: 7, approvedCommunity: false };
    await expect(publishLemmyArticle(article, config, jest.fn() as never)).rejects.toThrow(/approved/);
    const fetchMock = jest.fn(async () => jsonResponse({ post_view: { post: { id: 8, ap_id: "https://lemmy.example/post/8" } } })) as unknown as typeof fetch;
    await expect(publishLemmyArticle(article, { ...config, approvedCommunity: true }, fetchMock)).resolves.toMatchObject({ externalId: "8" });
  });
});

describe("Apple News, wiki, and Nostr adapters", () => {
  test("builds valid Apple News JSON, multipart, and HHMAC authorization", async () => {
    const document = buildAppleNewsArticle(article);
    expect(document).toMatchObject({ version: "1.7", language: "en", metadata: { canonicalURL: article.canonicalUrl } });
    const multipart = buildAppleNewsMultipart(article, "JoinAI_1234567890abcdef");
    expect(multipart.body.toString()).toContain('filename="article.json"');
    const authorization = createAppleNewsAuthorization({
      method: "POST",
      url: "https://news-api.apple.com/channels/11111111-1111-1111-1111-111111111111/articles",
      date: "2026-08-10T10:00:00Z",
      contentType: multipart.contentType,
      body: multipart.body,
      keyId: "key-id",
      keySecret: Buffer.from("secret").toString("base64"),
    });
    expect(authorization).toMatch(/^HHMAC; key="key-id"; signature="[^"]+"; date="2026-08-10T10:00:00Z"$/);
    expect(authorization).not.toContain("secret");

    const fetchMock = jest.fn(async () => jsonResponse({ data: { id: "a1", links: { shareUrl: "https://apple.news/a1" } } }, 201)) as unknown as typeof fetch;
    await expect(publishAppleNewsArticle(article, {
      channelId: "11111111-1111-1111-1111-111111111111",
      keyId: "key-id",
      keySecret: Buffer.from("secret").toString("base64"),
    }, fetchMock, new Date("2026-08-10T10:00:00.000Z"))).resolves.toMatchObject({ externalId: "a1" });
  });

  test("limits wiki output to approved non-Wikimedia communities", async () => {
    expect(buildWikiText(article)).toContain("== Source ==");
    const base = {
      credentials: { authorizationHeader: "Bearer token" },
      approvedCommunity: true,
      titlePrefix: "Join_AI_Religion/",
    };
    await expect(publishMediaWikiArticle(article, { ...base, apiUrl: "https://en.wikipedia.org/w/api.php" }, jest.fn() as never)).rejects.toThrow(/out of scope/);
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(jsonResponse({ query: { tokens: { csrftoken: "csrf+\\" } } }))
      .mockResolvedValueOnce(jsonResponse({ edit: { result: "Success", pageid: 9 } })) as unknown as typeof fetch;
    await expect(publishFandomArticle(article, { ...base, apiUrl: "https://joinai.fandom.com/api.php" }, fetchMock)).resolves.toMatchObject({ provider: "fandom", externalId: "9" });
    const editBody = String((fetchMock as jest.Mock).mock.calls[1][1].body);
    expect(editBody).toContain("assert=bot");
    expect(editBody).toContain("createonly=1");
  });

  test("builds NIP-23 events and requires two accepted relays", async () => {
    const signed: SignedNostrEvent = {
      ...(await buildUnsignedNostrArticle(article, { getPublicKey: async () => "a".repeat(64) }, new Date("2026-08-10T10:00:00Z"))),
      id: "b".repeat(64),
      sig: "c".repeat(128),
    };
    const signer: NostrSigner = {
      getPublicKey: async () => "a".repeat(64),
      signEvent: async (event) => ({ ...event, id: signed.id, sig: signed.sig }),
    };
    expect(signed.kind).toBe(30023);
    expect(signed.tags).toContainEqual(["r", article.canonicalUrl]);
    await expect(publishNostrArticle(article, { relayUrls: ["wss://relay.one", "wss://relay.two"] }, signer, async () => true)).resolves.toMatchObject({ externalId: signed.id });
    await expect(publishNostrArticle(article, { relayUrls: ["wss://relay.one", "wss://relay.two"] }, signer, async (url) => url.includes("one"))).rejects.toThrow(/accepted by 1\/2/);
  });
});

describe("provider readiness", () => {
  test("fails closed and never requires a secret value in the report", () => {
    const report = distributionProviderReadiness({ DISTRIBUTION_PUBLISHING_ENABLED: "true", DEV_PUBLISHING_ENABLED: "true" });
    expect(report.find((entry) => entry.provider === "dev")).toMatchObject({ ready: false, missing: ["DEV_API_KEY"] });
    expect(JSON.stringify(report)).not.toContain("api-key-value");
  });

  test("requires global and per-provider gates", () => {
    const configured = { DISTRIBUTION_PUBLISHING_ENABLED: "true", DEV_PUBLISHING_ENABLED: "true", DEV_API_KEY: "api-key-value" };
    expect(distributionProviderReadiness(configured).find((entry) => entry.provider === "dev")).toMatchObject({ enabled: true, ready: true });
    expect(() => assertDistributionProviderEnabled("dev", configured)).not.toThrow();
    expect(() => assertDistributionProviderEnabled("dev", { ...configured, DISTRIBUTION_PUBLISHING_ENABLED: "false" })).toThrow(/disabled/);
  });
});
