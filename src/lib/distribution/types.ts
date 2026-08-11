export const DISTRIBUTION_PROVIDERS = [
  "dev",
  "appleNews",
  "blogger",
  "tumblr",
  "hashnode",
  "ghost",
  "line",
  "lemmy",
  "mediawiki",
  "fandom",
  "nostr",
] as const;

export type DistributionProviderName = (typeof DISTRIBUTION_PROVIDERS)[number];

export type DistributionArticle = {
  idempotencyKey: string;
  title: string;
  summary: string;
  bodyMarkdown: string;
  canonicalUrl: string;
  locale: string;
  category: string;
  tags: string[];
  author: string;
  imageUrl: string;
  publishedAt: Date;
  updatedAt: Date;
  aiAssisted: boolean;
};

export type DistributionPublicationResult = {
  provider: DistributionProviderName;
  externalId: string;
  externalUrl: string | null;
};

export type FetchLike = typeof fetch;

export function assertDistributionArticle(article: DistributionArticle): void {
  if (!article.idempotencyKey.trim()) throw new Error("Distribution idempotency key is required");
  if (!article.title.trim() || article.title.length > 250) throw new Error("Distribution title is invalid");
  if (!article.summary.trim()) throw new Error("Distribution summary is required");
  if (!article.bodyMarkdown.trim()) throw new Error("Distribution body is required");
  if (!/^[a-z]{2}(?:-[A-Z]{2})?$/.test(article.locale)) throw new Error("Distribution locale is invalid");
  const canonicalUrl = new URL(article.canonicalUrl);
  if (
    canonicalUrl.protocol !== "https:"
    || canonicalUrl.hostname !== "joinaireligion.com"
    || !canonicalUrl.pathname.startsWith(`/content/${article.locale}/`)
  ) {
    throw new Error("Distribution canonical URL must be a public Join AI Religion content URL");
  }
  const imageUrl = new URL(article.imageUrl);
  if (imageUrl.protocol !== "https:" || imageUrl.hostname !== "joinaireligion.com") {
    throw new Error("Distribution image URL must be a public Join AI Religion asset");
  }
  if (!(article.publishedAt instanceof Date) || !Number.isFinite(article.publishedAt.getTime())) {
    throw new Error("Distribution publication time is invalid");
  }
}

export function normalizeHttpsOrigin(value: string, label: string): string {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new Error(`${label} must be an HTTPS origin without embedded credentials`);
  }
  return parsed.origin;
}

export function normalizeHttpsUrl(value: string, label: string): string {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new Error(`${label} must use HTTPS without embedded credentials`);
  }
  return parsed.toString();
}

export async function readProviderJson(response: Response, provider: DistributionProviderName): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok) throw new Error(`${provider} publication failed with HTTP ${response.status}`);
  if (!body || typeof body !== "object" || Array.isArray(body)) return {};
  return body as Record<string, unknown>;
}
