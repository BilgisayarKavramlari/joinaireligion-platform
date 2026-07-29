import crypto from "crypto";
import { env } from "@/lib/env";

export type SocialProviderName = "mastodon" | "x" | "linkedin" | "facebook" | "instagram" | "bluesky";
export const SOCIAL_LOCALES = ["en", "tr", "es", "de", "fr", "ru", "zh"] as const;
export type SocialLocale = (typeof SOCIAL_LOCALES)[number];
export const SOCIAL_LANGUAGE_POLICY_VERSION = "v1";

type LocaleWeight = { locale: SocialLocale; weight: number };

const PROVIDER_LOCALE_WEIGHTS: Record<SocialProviderName, readonly LocaleWeight[]> = {
  mastodon: [
    { locale: "tr", weight: 80 },
    { locale: "en", weight: 10 },
    { locale: "es", weight: 2 },
    { locale: "de", weight: 2 },
    { locale: "fr", weight: 2 },
    { locale: "ru", weight: 2 },
    { locale: "zh", weight: 2 },
  ],
  bluesky: [
    { locale: "en", weight: 75 },
    { locale: "tr", weight: 10 },
    { locale: "es", weight: 3 },
    { locale: "de", weight: 3 },
    { locale: "fr", weight: 3 },
    { locale: "ru", weight: 3 },
    { locale: "zh", weight: 3 },
  ],
  x: [
    { locale: "en", weight: 80 },
    { locale: "tr", weight: 10 },
    { locale: "es", weight: 2 },
    { locale: "de", weight: 2 },
    { locale: "fr", weight: 2 },
    { locale: "ru", weight: 2 },
    { locale: "zh", weight: 2 },
  ],
  linkedin: [
    { locale: "en", weight: 85 },
    { locale: "tr", weight: 5 },
    { locale: "es", weight: 2 },
    { locale: "de", weight: 2 },
    { locale: "fr", weight: 2 },
    { locale: "ru", weight: 2 },
    { locale: "zh", weight: 2 },
  ],
  facebook: [
    { locale: "en", weight: 70 },
    { locale: "tr", weight: 20 },
    { locale: "es", weight: 2 },
    { locale: "de", weight: 2 },
    { locale: "fr", weight: 2 },
    { locale: "ru", weight: 2 },
    { locale: "zh", weight: 2 },
  ],
  instagram: [
    { locale: "en", weight: 70 },
    { locale: "tr", weight: 20 },
    { locale: "es", weight: 2 },
    { locale: "de", weight: 2 },
    { locale: "fr", weight: 2 },
    { locale: "ru", weight: 2 },
    { locale: "zh", weight: 2 },
  ],
};

export type PublicSocialSignal = {
  provider: "mastodon" | "x";
  query: string;
  resultCount: number;
  terms: string[];
};

export type SocialPublicationResult = {
  provider: SocialProviderName;
  externalId: string;
  externalUrl: string | null;
};

const LISTENING_QUERIES = [
  "reflective journaling",
  "meaning making",
  "AI spirituality",
] as const;

function timeoutSignal() {
  return AbortSignal.timeout(15_000);
}

function normalizeBaseUrl(value: string | undefined): string {
  const parsed = new URL(value || "https://mastodon.social");
  if (parsed.protocol !== "https:") throw new Error("Social provider base URL must use HTTPS");
  return parsed.origin;
}

function normalizeBlueskyServiceUrl(value: string | undefined): string {
  const parsed = new URL(value || "https://bsky.social");
  if (parsed.protocol !== "https:") throw new Error("Bluesky service URL must use HTTPS");
  return parsed.origin;
}

function normalizeMetaGraphVersion(value: string | undefined): string {
  if (!value || !/^v\d+\.\d+$/.test(value)) throw new Error("Meta Graph version is not configured safely");
  return value;
}

function isSocialLocale(value: string): value is SocialLocale {
  return (SOCIAL_LOCALES as readonly string[]).includes(value);
}

/**
 * Pick a provider-specific locale from a stable seed. The weighted policy keeps
 * retries on the same locale while allowing low-volume coverage for every
 * supported language.
 */
export function selectProviderLocale(
  provider: SocialProviderName,
  seed: string,
  availableLocales: readonly string[] = SOCIAL_LOCALES,
): SocialLocale | null {
  const available = new Set(availableLocales.filter(isSocialLocale));
  if (available.size === 0) return null;

  const weights = PROVIDER_LOCALE_WEIGHTS[provider];
  const totalWeight = weights.reduce((sum, entry) => sum + entry.weight, 0);
  const digest = crypto.createHash("sha256").update(`${provider}|${seed}`).digest();
  let bucket = digest.readUInt32BE(0) % totalWeight;
  let selected = weights[0].locale;
  for (const entry of weights) {
    if (bucket < entry.weight) {
      selected = entry.locale;
      break;
    }
    bucket -= entry.weight;
  }
  if (available.has(selected)) return selected;
  return weights.find((entry) => available.has(entry.locale))?.locale ?? null;
}

export function contentLocaleFromText(text: string): SocialLocale | null {
  const match = text.match(/https:\/\/joinaireligion\.com\/content\/([a-z]{2})\//i);
  const locale = match?.[1]?.toLowerCase() || "";
  return isSocialLocale(locale) ? locale : null;
}

export function truncateBlueskyText(text: string): string {
  const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
  const encoder = new TextEncoder();
  let output = "";
  let count = 0;
  for (const { segment } of segmenter.segment(text)) {
    if (count >= 300 || encoder.encode(output + segment).length > 3_000) break;
    output += segment;
    count += 1;
  }
  return output;
}

export function buildBlueskyFacets(text: string): Array<{
  index: { byteStart: number; byteEnd: number };
  features: Array<{ $type: "app.bsky.richtext.facet#link"; uri: string }>;
}> {
  const encoder = new TextEncoder();
  const facets = [];
  for (const match of text.matchAll(/https:\/\/[^\s<>]+/g)) {
    const rawUrl = match[0];
    const uri = rawUrl.replace(/[),.;!?]+$/u, "");
    const start = match.index ?? 0;
    if (!uri) continue;
    facets.push({
      index: {
        byteStart: encoder.encode(text.slice(0, start)).length,
        byteEnd: encoder.encode(text.slice(0, start + uri.length)).length,
      },
      features: [{ $type: "app.bsky.richtext.facet#link" as const, uri }],
    });
  }
  return facets;
}

function extractTerms(texts: string[]): string[] {
  const counts = new Map<string, number>();
  for (const text of texts) {
    for (const match of text.toLowerCase().matchAll(/#[\p{L}\p{N}_-]{3,40}/gu)) {
      counts.set(match[0], (counts.get(match[0]) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 12)
    .map(([term]) => term);
}

export function getConfiguredSocialProviders(): SocialProviderName[] {
  const providers: SocialProviderName[] = [];
  if (env.MASTODON_ACCESS_TOKEN) providers.push("mastodon");
  if (env.X_USER_ACCESS_TOKEN) providers.push("x");
  if (env.LINKEDIN_ACCESS_TOKEN && env.LINKEDIN_AUTHOR_URN && env.LINKEDIN_VERSION) providers.push("linkedin");
  const metaConfigured = Boolean(env.META_GRAPH_VERSION && env.META_PAGE_ACCESS_TOKEN);
  if (env.FACEBOOK_PUBLISHING_ENABLED === "true" && metaConfigured && env.META_PAGE_ID) providers.push("facebook");
  if (env.INSTAGRAM_PUBLISHING_ENABLED === "true" && metaConfigured && env.INSTAGRAM_USER_ID) providers.push("instagram");
  if (env.BLUESKY_IDENTIFIER && env.BLUESKY_APP_PASSWORD) providers.push("bluesky");
  return providers;
}

async function listenMastodon(): Promise<PublicSocialSignal[]> {
  const baseUrl = normalizeBaseUrl(env.MASTODON_BASE_URL);
  const headers: HeadersInit = env.MASTODON_ACCESS_TOKEN
    ? { Authorization: `Bearer ${env.MASTODON_ACCESS_TOKEN}` }
    : {};
  const type = env.MASTODON_ACCESS_TOKEN ? "statuses" : "hashtags";
  const output: PublicSocialSignal[] = [];

  for (const query of LISTENING_QUERIES) {
    const url = new URL("/api/v2/search", baseUrl);
    url.searchParams.set("q", query);
    url.searchParams.set("type", type);
    url.searchParams.set("limit", "20");
    const response = await fetch(url, { headers, signal: timeoutSignal(), cache: "no-store" });
    if (!response.ok) throw new Error(`Mastodon listening failed with HTTP ${response.status}`);
    const payload = await response.json() as { statuses?: Array<{ content?: string; tags?: Array<{ name?: string }> }>; hashtags?: Array<{ name?: string }> };
    const statuses = payload.statuses || [];
    const hashtagNames = (payload.hashtags || []).map((tag) => `#${tag.name || ""}`);
    const statusTerms = statuses.flatMap((status) => [
      status.content || "",
      ...(status.tags || []).map((tag) => `#${tag.name || ""}`),
    ]);
    output.push({
      provider: "mastodon",
      query,
      resultCount: statuses.length + (payload.hashtags || []).length,
      terms: extractTerms([...hashtagNames, ...statusTerms]),
    });
  }
  return output;
}

async function listenX(): Promise<PublicSocialSignal[]> {
  if (!env.X_BEARER_TOKEN) return [];
  const output: PublicSocialSignal[] = [];
  for (const query of LISTENING_QUERIES) {
    const url = new URL("https://api.x.com/2/tweets/search/recent");
    url.searchParams.set("query", `${query} -is:retweet`);
    url.searchParams.set("max_results", "10");
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${env.X_BEARER_TOKEN}` },
      signal: timeoutSignal(),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`X listening failed with HTTP ${response.status}`);
    const payload = await response.json() as { data?: Array<{ text?: string }> };
    const posts = payload.data || [];
    output.push({ provider: "x", query, resultCount: posts.length, terms: extractTerms(posts.map((post) => post.text || "")) });
  }
  return output;
}

export async function collectPublicSocialSignals(): Promise<{ signals: PublicSocialSignal[]; errors: string[] }> {
  if (env.SOCIAL_LISTENING_ENABLED === "false") return { signals: [], errors: ["listening_disabled"] };
  const signals: PublicSocialSignal[] = [];
  const errors: string[] = [];
  for (const [provider, listener] of [["mastodon", listenMastodon], ["x", listenX]] as const) {
    try {
      signals.push(...await listener());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${provider}:${message.replace(/https?:\/\/\S+/g, "[redacted-url]").slice(0, 180)}`);
    }
  }
  return { signals, errors };
}

async function publishMastodon(text: string, idempotencyKey: string): Promise<SocialPublicationResult> {
  if (!env.MASTODON_ACCESS_TOKEN) throw new Error("Mastodon access token is not configured");
  const baseUrl = normalizeBaseUrl(env.MASTODON_BASE_URL);
  const language = contentLocaleFromText(text);
  if (!language) throw new Error("Mastodon publication has no supported content locale");
  const body = new URLSearchParams({ status: text.slice(0, 500), visibility: "public", language });
  const response = await fetch(new URL("/api/v1/statuses", baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.MASTODON_ACCESS_TOKEN}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": idempotencyKey,
    },
    body,
    signal: timeoutSignal(),
  });
  if (!response.ok) throw new Error(`Mastodon publication failed with HTTP ${response.status}`);
  const payload = await response.json() as { id?: string; url?: string };
  if (!payload.id) throw new Error("Mastodon publication returned no post id");
  return { provider: "mastodon", externalId: payload.id, externalUrl: payload.url || null };
}

async function publishX(text: string): Promise<SocialPublicationResult> {
  if (!env.X_USER_ACCESS_TOKEN) throw new Error("X user access token is not configured");
  const response = await fetch("https://api.x.com/2/tweets", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.X_USER_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text: text.slice(0, 280), made_with_ai: true }),
    signal: timeoutSignal(),
  });
  if (!response.ok) throw new Error(`X publication failed with HTTP ${response.status}`);
  const payload = await response.json() as { data?: { id?: string } };
  const externalId = payload.data?.id;
  if (!externalId) throw new Error("X publication returned no post id");
  return { provider: "x", externalId, externalUrl: `https://x.com/i/web/status/${externalId}` };
}

async function publishLinkedIn(text: string): Promise<SocialPublicationResult> {
  if (!env.LINKEDIN_ACCESS_TOKEN || !env.LINKEDIN_AUTHOR_URN || !env.LINKEDIN_VERSION) {
    throw new Error("LinkedIn publication is not fully configured");
  }
  const response = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.LINKEDIN_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      "Linkedin-Version": env.LINKEDIN_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: env.LINKEDIN_AUTHOR_URN,
      commentary: text.slice(0, 2800),
      visibility: "PUBLIC",
      distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
    signal: timeoutSignal(),
  });
  if (!response.ok) throw new Error(`LinkedIn publication failed with HTTP ${response.status}`);
  const externalId = response.headers.get("x-restli-id");
  if (!externalId) throw new Error("LinkedIn publication returned no post id");
  return { provider: "linkedin", externalId, externalUrl: `https://www.linkedin.com/feed/update/${encodeURIComponent(externalId)}/` };
}

function metaGraphUrl(path: string): URL {
  const version = normalizeMetaGraphVersion(env.META_GRAPH_VERSION);
  return new URL(`https://graph.facebook.com/${version}/${path.replace(/^\//, "")}`);
}

function requiredContentUrl(text: string): URL {
  const match = text.match(/https:\/\/joinaireligion\.com\/content\/[a-z]{2}\/[a-z0-9-]+/i);
  if (!match) throw new Error("Social publication has no approved Join AI Religion content URL");
  return new URL(match[0]);
}

function socialCardUrl(contentUrl: URL): string {
  const parts = contentUrl.pathname.split("/").filter(Boolean);
  if (parts.length !== 3 || parts[0] !== "content") throw new Error("Social content URL has an invalid route");
  return `${contentUrl.origin}/social-card/${encodeURIComponent(parts[1])}/${encodeURIComponent(parts[2])}.jpg`;
}

async function publishFacebook(text: string): Promise<SocialPublicationResult> {
  if (env.FACEBOOK_PUBLISHING_ENABLED !== "true" || !env.META_PAGE_ID || !env.META_PAGE_ACCESS_TOKEN) {
    throw new Error("Facebook publication is not fully configured");
  }
  const contentUrl = requiredContentUrl(text);
  const body = new URLSearchParams({
    message: text.slice(0, 5_000),
    link: contentUrl.toString(),
    access_token: env.META_PAGE_ACCESS_TOKEN,
  });
  const response = await fetch(metaGraphUrl(`${encodeURIComponent(env.META_PAGE_ID)}/feed`), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: timeoutSignal(),
  });
  if (!response.ok) throw new Error(`Facebook publication failed with HTTP ${response.status}`);
  const payload = await response.json() as { id?: string };
  if (!payload.id) throw new Error("Facebook publication returned no post id");
  return { provider: "facebook", externalId: payload.id, externalUrl: null };
}

async function publishInstagram(text: string): Promise<SocialPublicationResult> {
  if (env.INSTAGRAM_PUBLISHING_ENABLED !== "true" || !env.INSTAGRAM_USER_ID || !env.META_PAGE_ACCESS_TOKEN) {
    throw new Error("Instagram publication is not fully configured");
  }
  const contentUrl = requiredContentUrl(text);
  const createBody = new URLSearchParams({
    image_url: socialCardUrl(contentUrl),
    caption: text.slice(0, 2_200),
    access_token: env.META_PAGE_ACCESS_TOKEN,
  });
  const createResponse = await fetch(metaGraphUrl(`${encodeURIComponent(env.INSTAGRAM_USER_ID)}/media`), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: createBody,
    signal: timeoutSignal(),
  });
  if (!createResponse.ok) throw new Error(`Instagram container creation failed with HTTP ${createResponse.status}`);
  const created = await createResponse.json() as { id?: string };
  if (!created.id) throw new Error("Instagram container creation returned no id");

  let ready = false;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const statusUrl = metaGraphUrl(encodeURIComponent(created.id));
    statusUrl.searchParams.set("fields", "status_code");
    statusUrl.searchParams.set("access_token", env.META_PAGE_ACCESS_TOKEN);
    const statusResponse = await fetch(statusUrl, { signal: timeoutSignal(), cache: "no-store" });
    if (!statusResponse.ok) throw new Error(`Instagram container status failed with HTTP ${statusResponse.status}`);
    const status = await statusResponse.json() as { status_code?: string };
    if (status.status_code === "FINISHED") {
      ready = true;
      break;
    }
    if (status.status_code === "ERROR" || status.status_code === "EXPIRED") {
      throw new Error(`Instagram container entered ${status.status_code.toLowerCase()} state`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  if (!ready) throw new Error("Instagram container did not become ready before timeout");

  const publishBody = new URLSearchParams({
    creation_id: created.id,
    access_token: env.META_PAGE_ACCESS_TOKEN,
  });
  const publishResponse = await fetch(metaGraphUrl(`${encodeURIComponent(env.INSTAGRAM_USER_ID)}/media_publish`), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: publishBody,
    signal: timeoutSignal(),
  });
  if (!publishResponse.ok) throw new Error(`Instagram publication failed with HTTP ${publishResponse.status}`);
  const published = await publishResponse.json() as { id?: string };
  if (!published.id) throw new Error("Instagram publication returned no media id");

  const permalinkUrl = metaGraphUrl(encodeURIComponent(published.id));
  permalinkUrl.searchParams.set("fields", "permalink");
  permalinkUrl.searchParams.set("access_token", env.META_PAGE_ACCESS_TOKEN);
  const permalinkResponse = await fetch(permalinkUrl, { signal: timeoutSignal(), cache: "no-store" });
  const permalink = permalinkResponse.ok
    ? (await permalinkResponse.json() as { permalink?: string }).permalink || null
    : null;
  return { provider: "instagram", externalId: published.id, externalUrl: permalink };
}

async function publishBluesky(text: string): Promise<SocialPublicationResult> {
  if (!env.BLUESKY_IDENTIFIER || !env.BLUESKY_APP_PASSWORD) {
    throw new Error("Bluesky publication is not fully configured");
  }
  const baseUrl = normalizeBlueskyServiceUrl(env.BLUESKY_SERVICE_URL);
  const sessionResponse = await fetch(new URL("/xrpc/com.atproto.server.createSession", baseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: env.BLUESKY_IDENTIFIER, password: env.BLUESKY_APP_PASSWORD }),
    signal: timeoutSignal(),
  });
  if (!sessionResponse.ok) throw new Error(`Bluesky authentication failed with HTTP ${sessionResponse.status}`);
  const session = await sessionResponse.json() as { accessJwt?: string; did?: string; handle?: string };
  if (!session.accessJwt || !session.did || !session.handle) {
    throw new Error("Bluesky authentication returned an incomplete session");
  }

  const postText = truncateBlueskyText(text);
  const facets = buildBlueskyFacets(postText);
  const localeMatch = postText.match(/joinaireligion\.com\/content\/([a-z]{2})\//i);
  const response = await fetch(new URL("/xrpc/com.atproto.repo.createRecord", baseUrl), {
    method: "POST",
    headers: { Authorization: `Bearer ${session.accessJwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      repo: session.did,
      collection: "app.bsky.feed.post",
      record: {
        $type: "app.bsky.feed.post",
        text: postText,
        ...(facets.length > 0 ? { facets } : {}),
        ...(localeMatch ? { langs: [localeMatch[1].toLowerCase()] } : {}),
        createdAt: new Date().toISOString(),
      },
    }),
    signal: timeoutSignal(),
  });
  if (!response.ok) throw new Error(`Bluesky publication failed with HTTP ${response.status}`);
  const payload = await response.json() as { uri?: string; cid?: string };
  if (!payload.uri || !payload.cid) throw new Error("Bluesky publication returned no record reference");
  const rkey = payload.uri.split("/").pop();
  if (!rkey) throw new Error("Bluesky publication returned an invalid record URI");
  return {
    provider: "bluesky",
    externalId: payload.uri,
    externalUrl: `https://bsky.app/profile/${encodeURIComponent(session.handle)}/post/${encodeURIComponent(rkey)}`,
  };
}

export function socialIdempotencyKey(parts: string[]): string {
  return crypto.createHash("sha256").update(parts.join("|")).digest("hex");
}

export async function publishSocialPost(
  provider: SocialProviderName,
  text: string,
  idempotencyKey: string
): Promise<SocialPublicationResult> {
  if (env.SOCIAL_PUBLISHING_ENABLED !== "true") throw new Error("Social publishing is disabled");
  if (provider === "mastodon") return publishMastodon(text, idempotencyKey);
  if (provider === "x") return publishX(text);
  if (provider === "linkedin") return publishLinkedIn(text);
  if (provider === "facebook") return publishFacebook(text);
  if (provider === "instagram") return publishInstagram(text);
  return publishBluesky(text);
}
