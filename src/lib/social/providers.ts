import crypto from "crypto";
import { env } from "@/lib/env";

export type SocialProviderName = "mastodon" | "x" | "linkedin";

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
  const body = new URLSearchParams({ status: text.slice(0, 500), visibility: "public", language: "en" });
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
  return publishLinkedIn(text);
}
