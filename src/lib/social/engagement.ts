import { env } from "@/lib/env";
import type { SocialProviderName } from "@/lib/social/providers";

export type SocialEngagementMetrics = {
  likes: number;
  comments: number;
  shares: number;
  views: number;
  clicks: number;
};

export type SocialEngagementResult = {
  provider: SocialProviderName;
  externalId: string;
  status: "COLLECTED" | "UNAVAILABLE" | "FAILED";
  metrics: SocialEngagementMetrics;
  reason?: string;
};

const EMPTY_METRICS: SocialEngagementMetrics = { likes: 0, comments: 0, shares: 0, views: 0, clicks: 0 };

function count(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : 0;
}

async function readJson(url: URL, init: RequestInit = {}): Promise<Record<string, unknown>> {
  const response = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`provider_http_${response.status}`);
  const payload = await response.json();
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("provider_invalid_json");
  return payload as Record<string, unknown>;
}

function metaUrl(id: string): URL {
  if (!env.META_GRAPH_VERSION || !/^v\d+\.\d+$/.test(env.META_GRAPH_VERSION)) throw new Error("meta_version_unavailable");
  return new URL(`https://graph.facebook.com/${env.META_GRAPH_VERSION}/${encodeURIComponent(id)}`);
}

async function mastodonMetrics(externalId: string): Promise<SocialEngagementMetrics> {
  const origin = new URL(env.MASTODON_BASE_URL || "https://mastodon.social").origin;
  const payload = await readJson(new URL(`/api/v1/statuses/${encodeURIComponent(externalId)}`, origin), env.MASTODON_ACCESS_TOKEN
    ? { headers: { Authorization: `Bearer ${env.MASTODON_ACCESS_TOKEN}` } }
    : {});
  return {
    likes: count(payload.favourites_count),
    comments: count(payload.replies_count),
    shares: count(payload.reblogs_count) + count(payload.quotes_count),
    views: 0,
    clicks: 0,
  };
}

async function blueskyMetrics(externalId: string): Promise<SocialEngagementMetrics> {
  if (!externalId.startsWith("at://")) throw new Error("bluesky_invalid_uri");
  const url = new URL("https://public.api.bsky.app/xrpc/app.bsky.feed.getPosts");
  url.searchParams.append("uris", externalId);
  const payload = await readJson(url);
  const post = Array.isArray(payload.posts) && payload.posts[0] && typeof payload.posts[0] === "object"
    ? payload.posts[0] as Record<string, unknown>
    : null;
  if (!post) throw new Error("bluesky_post_unavailable");
  return {
    likes: count(post.likeCount),
    comments: count(post.replyCount),
    shares: count(post.repostCount) + count(post.quoteCount),
    views: 0,
    clicks: 0,
  };
}

async function xMetrics(externalId: string): Promise<SocialEngagementMetrics> {
  const token = env.X_BEARER_TOKEN || env.X_USER_ACCESS_TOKEN;
  if (!token) throw new Error("x_read_token_unavailable");
  const url = new URL(`https://api.x.com/2/tweets/${encodeURIComponent(externalId)}`);
  url.searchParams.set("tweet.fields", "public_metrics");
  const payload = await readJson(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = payload.data && typeof payload.data === "object" ? payload.data as Record<string, unknown> : {};
  const metrics = data.public_metrics && typeof data.public_metrics === "object"
    ? data.public_metrics as Record<string, unknown>
    : {};
  return {
    likes: count(metrics.like_count),
    comments: count(metrics.reply_count),
    shares: count(metrics.retweet_count) + count(metrics.quote_count),
    views: count(metrics.impression_count),
    clicks: 0,
  };
}

async function instagramMetrics(externalId: string): Promise<SocialEngagementMetrics> {
  if (!env.META_PAGE_ACCESS_TOKEN) throw new Error("instagram_read_token_unavailable");
  const url = metaUrl(externalId);
  url.searchParams.set("fields", "like_count,comments_count");
  url.searchParams.set("access_token", env.META_PAGE_ACCESS_TOKEN);
  const payload = await readJson(url);
  return { ...EMPTY_METRICS, likes: count(payload.like_count), comments: count(payload.comments_count) };
}

async function facebookMetrics(externalId: string): Promise<SocialEngagementMetrics> {
  if (!env.META_PAGE_ACCESS_TOKEN) throw new Error("facebook_read_token_unavailable");
  const url = metaUrl(externalId);
  url.searchParams.set("fields", "reactions.limit(0).summary(true),comments.limit(0).summary(true),shares");
  url.searchParams.set("access_token", env.META_PAGE_ACCESS_TOKEN);
  const payload = await readJson(url);
  const reactions = payload.reactions && typeof payload.reactions === "object" ? payload.reactions as Record<string, unknown> : {};
  const comments = payload.comments && typeof payload.comments === "object" ? payload.comments as Record<string, unknown> : {};
  const reactionSummary = reactions.summary && typeof reactions.summary === "object" ? reactions.summary as Record<string, unknown> : {};
  const commentSummary = comments.summary && typeof comments.summary === "object" ? comments.summary as Record<string, unknown> : {};
  const shares = payload.shares && typeof payload.shares === "object" ? payload.shares as Record<string, unknown> : {};
  return {
    ...EMPTY_METRICS,
    likes: count(reactionSummary.total_count),
    comments: count(commentSummary.total_count),
    shares: count(shares.count),
  };
}

async function threadsMetrics(externalId: string): Promise<SocialEngagementMetrics> {
  if (!env.THREADS_ACCESS_TOKEN) throw new Error("threads_read_token_unavailable");
  const url = new URL(`https://graph.threads.net/${encodeURIComponent(externalId)}`);
  url.searchParams.set("fields", "like_count,replies_count,reposts_count,quotes_count,views");
  url.searchParams.set("access_token", env.THREADS_ACCESS_TOKEN);
  const payload = await readJson(url);
  return {
    likes: count(payload.like_count),
    comments: count(payload.replies_count),
    shares: count(payload.reposts_count) + count(payload.quotes_count),
    views: count(payload.views),
    clicks: 0,
  };
}

export async function collectSocialEngagement(
  provider: SocialProviderName,
  externalId: string,
): Promise<SocialEngagementResult> {
  if (!externalId) return { provider, externalId, status: "UNAVAILABLE", metrics: EMPTY_METRICS, reason: "external_id_unavailable" };
  if (provider === "linkedin" || provider === "pinterest") {
    return { provider, externalId, status: "UNAVAILABLE", metrics: EMPTY_METRICS, reason: "provider_analytics_scope_not_configured" };
  }
  try {
    const metrics = provider === "mastodon" ? await mastodonMetrics(externalId)
      : provider === "bluesky" ? await blueskyMetrics(externalId)
        : provider === "x" ? await xMetrics(externalId)
          : provider === "instagram" ? await instagramMetrics(externalId)
            : provider === "facebook" ? await facebookMetrics(externalId)
              : await threadsMetrics(externalId);
    return { provider, externalId, status: "COLLECTED", metrics };
  } catch (error) {
    const reason = error instanceof Error ? error.message.replace(/https?:\/\/\S+/g, "[redacted-url]").slice(0, 120) : "provider_read_failed";
    return { provider, externalId, status: "FAILED", metrics: EMPTY_METRICS, reason };
  }
}
