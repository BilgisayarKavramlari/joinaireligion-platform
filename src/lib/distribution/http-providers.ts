import crypto from "crypto";
import { distributionMarkdownToHtml, distributionMarkdownToPlainText } from "@/lib/distribution/content";
import {
  assertDistributionArticle,
  normalizeHttpsOrigin,
  readProviderJson,
  type DistributionArticle,
  type DistributionPublicationResult,
  type FetchLike,
} from "@/lib/distribution/types";

const REQUEST_TIMEOUT_MS = 20_000;

function timeoutSignal(): AbortSignal {
  return AbortSignal.timeout(REQUEST_TIMEOUT_MS);
}

function disclosure(locale: string): string {
  return locale === "tr"
    ? "Bu içerik yapay zekâ desteğiyle hazırlanmış ve yayımlanmadan önce güvenlik ve kalite kontrollerinden geçirilmiştir."
    : "This content was prepared with AI assistance and passed safety and quality checks before publication.";
}

function markdownWithDisclosure(article: DistributionArticle): string {
  return `> ${disclosure(article.locale)}\n\n${article.bodyMarkdown}\n\n[Original article](${article.canonicalUrl})`;
}

function htmlWithDisclosure(article: DistributionArticle): string {
  return `<p><em>${disclosure(article.locale)}</em></p>\n${distributionMarkdownToHtml(article.bodyMarkdown)}\n<p><a href="${article.canonicalUrl}" rel="canonical">Original article</a></p>`;
}

function tagList(article: DistributionArticle, limit = 4): string[] {
  return article.tags
    .map((tag) => tag.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30))
    .filter(Boolean)
    .slice(0, limit);
}

function oauthPercentEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

export function createOAuth1Authorization(input: {
  method: string;
  url: string;
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  tokenSecret: string;
  nonce?: string;
  timestamp?: number;
}): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: input.consumerKey,
    oauth_nonce: input.nonce || crypto.randomBytes(24).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(input.timestamp ?? Math.floor(Date.now() / 1_000)),
    oauth_token: input.accessToken,
    oauth_version: "1.0",
  };
  const parameterString = Object.entries(oauthParams)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${oauthPercentEncode(key)}=${oauthPercentEncode(value)}`)
    .join("&");
  const signatureBase = [input.method.toUpperCase(), oauthPercentEncode(input.url), oauthPercentEncode(parameterString)].join("&");
  const signingKey = `${oauthPercentEncode(input.consumerSecret)}&${oauthPercentEncode(input.tokenSecret)}`;
  oauthParams.oauth_signature = crypto.createHmac("sha1", signingKey).update(signatureBase).digest("base64");
  return `OAuth ${Object.entries(oauthParams)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${oauthPercentEncode(key)}="${oauthPercentEncode(value)}"`)
    .join(", ")}`;
}

export async function publishDevArticle(
  article: DistributionArticle,
  config: { apiKey: string; organizationId?: number },
  fetchImpl: FetchLike = fetch,
): Promise<DistributionPublicationResult> {
  assertDistributionArticle(article);
  if (!config.apiKey.trim()) throw new Error("DEV API key is required");
  const response = await fetchImpl("https://dev.to/api/articles", {
    method: "POST",
    headers: {
      Accept: "application/vnd.forem.api-v1+json",
      "Content-Type": "application/json",
      "api-key": config.apiKey,
    },
    body: JSON.stringify({
      article: {
        title: article.title,
        description: article.summary.slice(0, 200),
        body_markdown: markdownWithDisclosure(article),
        published: true,
        canonical_url: article.canonicalUrl,
        main_image: article.imageUrl,
        tags: tagList(article),
        ...(config.organizationId ? { organization_id: config.organizationId } : {}),
      },
    }),
    signal: timeoutSignal(),
  });
  const data = await readProviderJson(response, "dev");
  return {
    provider: "dev",
    externalId: String(data.id ?? data.slug ?? ""),
    externalUrl: typeof data.url === "string" ? data.url : null,
  };
}

export async function publishBloggerArticle(
  article: DistributionArticle,
  config: {
    blogId: string;
    draft?: boolean;
    accessToken?: string;
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
  },
  fetchImpl: FetchLike = fetch,
): Promise<DistributionPublicationResult> {
  assertDistributionArticle(article);
  if (!config.blogId.trim()) throw new Error("Blogger blog ID is required");
  let accessToken = config.accessToken?.trim();
  if (!accessToken) {
    if (!config.clientId?.trim() || !config.clientSecret?.trim() || !config.refreshToken?.trim()) {
      throw new Error("Blogger access token or complete refresh credentials are required");
    }
    const tokenResponse = await fetchImpl("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: config.refreshToken,
      }),
      signal: timeoutSignal(),
    });
    const tokenData = await readProviderJson(tokenResponse, "blogger");
    accessToken = typeof tokenData.access_token === "string" ? tokenData.access_token : "";
    if (!accessToken) throw new Error("Blogger token refresh returned no access token");
  }
  const endpoint = new URL(`https://www.googleapis.com/blogger/v3/blogs/${encodeURIComponent(config.blogId)}/posts`);
  endpoint.searchParams.set("isDraft", config.draft ? "true" : "false");
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "blogger#post",
      title: article.title,
      content: htmlWithDisclosure(article),
      labels: tagList(article, 10),
    }),
    signal: timeoutSignal(),
  });
  const data = await readProviderJson(response, "blogger");
  return { provider: "blogger", externalId: String(data.id ?? ""), externalUrl: typeof data.url === "string" ? data.url : null };
}

export async function publishTumblrArticle(
  article: DistributionArticle,
  config: {
    blogIdentifier: string;
    draft?: boolean;
    bearerAccessToken?: string;
    consumerKey?: string;
    consumerSecret?: string;
    accessToken?: string;
    tokenSecret?: string;
  },
  fetchImpl: FetchLike = fetch,
): Promise<DistributionPublicationResult> {
  assertDistributionArticle(article);
  if (!config.blogIdentifier.trim()) throw new Error("Tumblr blog identifier is required");
  const endpoint = `https://api.tumblr.com/v2/blog/${encodeURIComponent(config.blogIdentifier)}/posts`;
  const authorization = config.bearerAccessToken?.trim()
    ? `Bearer ${config.bearerAccessToken.trim()}`
    : config.consumerKey?.trim() && config.consumerSecret?.trim() && config.accessToken?.trim() && config.tokenSecret?.trim()
      ? createOAuth1Authorization({
        method: "POST",
        url: endpoint,
        consumerKey: config.consumerKey,
        consumerSecret: config.consumerSecret,
        accessToken: config.accessToken,
        tokenSecret: config.tokenSecret,
      })
      : "";
  if (!authorization) throw new Error("Tumblr OAuth1 owner credentials or OAuth2 bearer token are required");
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
      "User-Agent": "JoinAIReligionPublisher (+https://joinaireligion.com)",
    },
    body: JSON.stringify({
      state: config.draft ? "draft" : "published",
      tags: tagList(article, 20).join(","),
      source_url: article.canonicalUrl,
      content: [
        { type: "text", subtype: "heading1", text: article.title },
        { type: "text", subtype: "indented", text: disclosure(article.locale) },
        { type: "text", text: distributionMarkdownToPlainText(article.bodyMarkdown) },
        { type: "link", url: article.canonicalUrl, title: article.title, description: article.summary },
      ],
    }),
    signal: timeoutSignal(),
  });
  const data = await readProviderJson(response, "tumblr");
  const nested = data.response && typeof data.response === "object" ? data.response as Record<string, unknown> : data;
  return {
    provider: "tumblr",
    externalId: String(nested.id_string ?? nested.id ?? ""),
    externalUrl: typeof nested.post_url === "string" ? nested.post_url : null,
  };
}

const HASHNODE_PUBLISH_MUTATION = `
mutation PublishDistributionPost($input: PublishPostInput!) {
  publishPost(input: $input) { post { id url } }
}`;

export async function publishHashnodeArticle(
  article: DistributionArticle,
  config: { personalAccessToken: string; publicationId: string },
  fetchImpl: FetchLike = fetch,
): Promise<DistributionPublicationResult> {
  assertDistributionArticle(article);
  if (!config.personalAccessToken.trim() || !config.publicationId.trim()) throw new Error("Hashnode Pro token and publication ID are required");
  const response = await fetchImpl("https://gql.hashnode.com", {
    method: "POST",
    headers: { Authorization: config.personalAccessToken, Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      query: HASHNODE_PUBLISH_MUTATION,
      variables: {
        input: {
          publicationId: config.publicationId,
          title: article.title,
          subtitle: article.summary.slice(0, 150),
          contentMarkdown: markdownWithDisclosure(article),
          originalArticleURL: article.canonicalUrl,
          coverImage: article.imageUrl,
          tags: tagList(article, 5).map((name) => ({ name, slug: name })),
        },
      },
    }),
    signal: timeoutSignal(),
  });
  const data = await readProviderJson(response, "hashnode");
  if (Array.isArray(data.errors) && data.errors.length > 0) throw new Error("hashnode publication returned GraphQL errors");
  const root = data.data && typeof data.data === "object" ? data.data as Record<string, unknown> : {};
  const publishPost = root.publishPost && typeof root.publishPost === "object" ? root.publishPost as Record<string, unknown> : {};
  const post = publishPost.post && typeof publishPost.post === "object" ? publishPost.post as Record<string, unknown> : {};
  return { provider: "hashnode", externalId: String(post.id ?? ""), externalUrl: typeof post.url === "string" ? post.url : null };
}

function base64Url(value: string): string {
  return Buffer.from(value).toString("base64url");
}

export function createGhostAdminToken(adminApiKey: string, now = new Date()): string {
  const [keyId, secretHex, ...extra] = adminApiKey.split(":");
  if (!keyId || !secretHex || extra.length || !/^[a-f0-9]+$/i.test(secretHex) || secretHex.length % 2 !== 0) {
    throw new Error("Ghost Admin API key is invalid");
  }
  const issuedAt = Math.floor(now.getTime() / 1000);
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT", kid: keyId }));
  const payload = base64Url(JSON.stringify({ iat: issuedAt, exp: issuedAt + 300, aud: "/admin/" }));
  const unsigned = `${header}.${payload}`;
  const signature = crypto.createHmac("sha256", Buffer.from(secretHex, "hex")).update(unsigned).digest("base64url");
  return `${unsigned}.${signature}`;
}

export async function publishGhostArticle(
  article: DistributionArticle,
  config: { adminUrl: string; adminApiKey: string; apiVersion?: string },
  fetchImpl: FetchLike = fetch,
): Promise<DistributionPublicationResult> {
  assertDistributionArticle(article);
  const origin = normalizeHttpsOrigin(config.adminUrl, "Ghost Admin URL");
  const token = createGhostAdminToken(config.adminApiKey);
  const response = await fetchImpl(`${origin}/ghost/api/admin/posts/?source=html`, {
    method: "POST",
    headers: {
      Authorization: `Ghost ${token}`,
      "Content-Type": "application/json",
      "Accept-Version": config.apiVersion || "v6.0",
    },
    body: JSON.stringify({ posts: [{
      title: article.title,
      html: htmlWithDisclosure(article),
      status: "published",
      canonical_url: article.canonicalUrl,
      custom_excerpt: article.summary.slice(0, 300),
      feature_image: article.imageUrl,
      tags: tagList(article, 10).map((name) => ({ name })),
    }] }),
    signal: timeoutSignal(),
  });
  const data = await readProviderJson(response, "ghost");
  const posts = Array.isArray(data.posts) ? data.posts : [];
  const post = posts[0] && typeof posts[0] === "object" ? posts[0] as Record<string, unknown> : {};
  return { provider: "ghost", externalId: String(post.id ?? ""), externalUrl: typeof post.url === "string" ? post.url : null };
}

export async function publishLineBroadcast(
  article: DistributionArticle,
  config: { channelAccessToken: string; retryKey: string },
  fetchImpl: FetchLike = fetch,
): Promise<DistributionPublicationResult> {
  assertDistributionArticle(article);
  if (!config.channelAccessToken.trim()) throw new Error("LINE channel access token is required");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(config.retryKey)) {
    throw new Error("LINE retry key must be a UUID");
  }
  const text = `${article.title}\n\n${article.summary}\n\n${article.canonicalUrl}`.slice(0, 5_000);
  const response = await fetchImpl("https://api.line.me/v2/bot/message/broadcast", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.channelAccessToken}`,
      "Content-Type": "application/json",
      "X-Line-Retry-Key": config.retryKey,
    },
    body: JSON.stringify({ messages: [{ type: "text", text }] }),
    signal: timeoutSignal(),
  });
  if (response.status !== 409) await readProviderJson(response, "line");
  return {
    provider: "line",
    externalId: response.headers.get("x-line-accepted-request-id") || response.headers.get("x-line-request-id") || config.retryKey,
    externalUrl: null,
  };
}

export async function publishLemmyArticle(
  article: DistributionArticle,
  config: { instanceUrl: string; accessToken: string; communityId: number; approvedCommunity: boolean; languageId?: number },
  fetchImpl: FetchLike = fetch,
): Promise<DistributionPublicationResult> {
  assertDistributionArticle(article);
  if (!config.approvedCommunity) throw new Error("Lemmy publication requires an explicitly approved or owned community");
  if (!config.accessToken.trim() || !Number.isInteger(config.communityId) || config.communityId <= 0) {
    throw new Error("Lemmy token and community ID are required");
  }
  const origin = normalizeHttpsOrigin(config.instanceUrl, "Lemmy instance URL");
  const response = await fetchImpl(`${origin}/api/v4/post`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: article.title,
      community_id: config.communityId,
      url: article.canonicalUrl,
      body: `${article.summary}\n\n${disclosure(article.locale)}`,
      alt_text: article.title,
      ...(config.languageId ? { language_id: config.languageId } : {}),
    }),
    signal: timeoutSignal(),
  });
  const data = await readProviderJson(response, "lemmy");
  const view = data.post_view && typeof data.post_view === "object" ? data.post_view as Record<string, unknown> : {};
  const post = view.post && typeof view.post === "object" ? view.post as Record<string, unknown> : {};
  return { provider: "lemmy", externalId: String(post.id ?? ""), externalUrl: typeof post.ap_id === "string" ? post.ap_id : null };
}
