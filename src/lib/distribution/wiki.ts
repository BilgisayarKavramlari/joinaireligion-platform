import { distributionMarkdownToPlainText, distributionSlug } from "@/lib/distribution/content";
import {
  assertDistributionArticle,
  normalizeHttpsUrl,
  type DistributionArticle,
  type DistributionProviderName,
  type DistributionPublicationResult,
  type FetchLike,
} from "@/lib/distribution/types";

type WikiCredentials = { authorizationHeader?: string; cookie?: string };

function wikiHeaders(credentials: WikiCredentials): HeadersInit {
  if (!credentials.authorizationHeader?.trim() && !credentials.cookie?.trim()) {
    throw new Error("Wiki OAuth authorization or authenticated bot session is required");
  }
  return {
    ...(credentials.authorizationHeader ? { Authorization: credentials.authorizationHeader } : {}),
    ...(credentials.cookie ? { Cookie: credentials.cookie } : {}),
  };
}

function validateWikiApi(apiUrl: string, provider: "mediawiki" | "fandom"): string {
  const normalized = normalizeHttpsUrl(apiUrl, `${provider} API URL`);
  const parsed = new URL(normalized);
  if (!parsed.pathname.endsWith("/api.php")) throw new Error(`${provider} API URL must end in /api.php`);
  if (provider === "fandom" && !parsed.hostname.endsWith(".fandom.com")) throw new Error("Fandom API URL must use a fandom.com community");
  if (provider === "mediawiki" && /(^|\.)(wikipedia|wikimedia|mediawiki)\.org$/i.test(parsed.hostname)) {
    throw new Error("Automated promotional edits to public Wikimedia projects are out of scope");
  }
  return normalized;
}

async function wikiJson(response: Response, provider: DistributionProviderName): Promise<Record<string, unknown>> {
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${provider} request failed with HTTP ${response.status}`);
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error(`${provider} returned an invalid response`);
  return data as Record<string, unknown>;
}

export function buildWikiText(article: DistributionArticle): string {
  assertDistributionArticle(article);
  const disclosure = article.locale === "tr"
    ? "Bu sayfa yapay zekâ desteğiyle hazırlanmış ve yayımlanmadan önce güvenlik ve kalite kontrollerinden geçirilmiştir."
    : "This page was prepared with AI assistance and passed safety and quality checks before publication.";
  return `${article.summary}\n\n''${disclosure}''\n\n${distributionMarkdownToPlainText(article.bodyMarkdown)}\n\n== Source ==\n* [${article.canonicalUrl} Original article]`;
}

async function publishWikiArticle(
  provider: "mediawiki" | "fandom",
  article: DistributionArticle,
  config: {
    apiUrl: string;
    credentials: WikiCredentials;
    approvedCommunity: boolean;
    titlePrefix: string;
    baseRevisionId?: number;
  },
  fetchImpl: FetchLike,
): Promise<DistributionPublicationResult> {
  assertDistributionArticle(article);
  if (!config.approvedCommunity) throw new Error(`${provider} publication requires explicit community-owner approval`);
  if (!config.titlePrefix.trim()) throw new Error(`${provider} title prefix is required`);
  const apiUrl = validateWikiApi(config.apiUrl, provider);
  const authHeaders = wikiHeaders(config.credentials);
  const tokenUrl = new URL(apiUrl);
  tokenUrl.search = new URLSearchParams({ action: "query", meta: "tokens", type: "csrf", format: "json", formatversion: "2" }).toString();
  const tokenResponse = await fetchImpl(tokenUrl, { headers: authHeaders, signal: AbortSignal.timeout(20_000) });
  const tokenData = await wikiJson(tokenResponse, provider);
  const query = tokenData.query && typeof tokenData.query === "object" ? tokenData.query as Record<string, unknown> : {};
  const tokens = query.tokens && typeof query.tokens === "object" ? query.tokens as Record<string, unknown> : {};
  const csrfToken = typeof tokens.csrftoken === "string" ? tokens.csrftoken : "";
  if (!csrfToken) throw new Error(`${provider} CSRF token was not returned`);

  const title = `${config.titlePrefix}${distributionSlug(article)}`;
  const form = new URLSearchParams({
    action: "edit",
    format: "json",
    formatversion: "2",
    title,
    text: buildWikiText(article),
    summary: `Publish reviewed source article ${article.canonicalUrl}`,
    token: csrfToken,
    bot: "1",
    assert: "bot",
    ...(config.baseRevisionId ? { baserevid: String(config.baseRevisionId) } : { createonly: "1" }),
  });
  const editResponse = await fetchImpl(apiUrl, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
    signal: AbortSignal.timeout(20_000),
  });
  const editData = await wikiJson(editResponse, provider);
  if (editData.error) throw new Error(`${provider} edit was rejected`);
  const edit = editData.edit && typeof editData.edit === "object" ? editData.edit as Record<string, unknown> : {};
  if (edit.result !== "Success") throw new Error(`${provider} edit did not succeed`);
  const externalIdValue = edit.pageid ?? edit.newrevid;
  const externalId = typeof externalIdValue === "string" || typeof externalIdValue === "number"
    ? String(externalIdValue).trim()
    : "";
  if (!externalId) throw new Error(`${provider} edit returned no page or revision ID`);
  const pageUrl = new URL(apiUrl);
  pageUrl.pathname = pageUrl.pathname.replace(/\/api\.php$/, "/index.php");
  pageUrl.search = new URLSearchParams({ title }).toString();
  return { provider, externalId, externalUrl: pageUrl.toString() };
}

export function publishMediaWikiArticle(
  article: DistributionArticle,
  config: Parameters<typeof publishWikiArticle>[2],
  fetchImpl: FetchLike = fetch,
): Promise<DistributionPublicationResult> {
  return publishWikiArticle("mediawiki", article, config, fetchImpl);
}

export function publishFandomArticle(
  article: DistributionArticle,
  config: Parameters<typeof publishWikiArticle>[2],
  fetchImpl: FetchLike = fetch,
): Promise<DistributionPublicationResult> {
  return publishWikiArticle("fandom", article, config, fetchImpl);
}
