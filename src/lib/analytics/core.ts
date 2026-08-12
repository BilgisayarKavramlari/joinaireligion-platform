import crypto from "node:crypto";

export const ANALYTICS_EVENT_NAMES = [
  "analytics_page_view",
  "analytics_link_click",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export type AnalyticsEventRow = {
  eventName: string;
  anonymousSessionId: string | null;
  path: string | null;
  metadata: unknown;
  createdAt: Date;
};

export type RankedMetric = { label: string; count: number };

export type TrafficSummary = {
  from: string;
  to: string;
  pageViews: number;
  sessions: number;
  linkClicks: number;
  registrationClicks: number;
  topSources: RankedMetric[];
  topLandingPages: RankedMetric[];
  topPages: RankedMetric[];
  topCountries: RankedMetric[];
  topLocales: RankedMetric[];
  sourceByLocale: Array<{ source: string; locale: string; sessions: number }>;
  excludedVerificationEvents: number;
  sampled: boolean;
  containsUserLevelData: false;
};

const SAFE_TOKEN = /^[a-z0-9][a-z0-9._-]*$/i;
const SAFE_COUNTRY = /^[A-Z]{2}$/;

export function sanitizeAnalyticsToken(value: unknown, maxLength = 64): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase().slice(0, maxLength);
  return normalized && SAFE_TOKEN.test(normalized) ? normalized : null;
}

export function sanitizeAnalyticsPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.length > 300) return null;
  try {
    const parsed = new URL(raw, "https://joinaireligion.com");
    return parsed.pathname.slice(0, 240) || "/";
  } catch {
    return null;
  }
}

export function sanitizeReferrerHost(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase().replace(/\.$/, "").slice(0, 160);
  if (!normalized || !/^[a-z0-9.-]+$/.test(normalized) || !normalized.includes(".")) return null;
  return normalized;
}

export function normalizeCountryCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const country = value.trim().toUpperCase();
  return SAFE_COUNTRY.test(country) && country !== "XX" ? country : null;
}

export function dailySessionHash(sessionId: string, now: Date, secret: string | undefined): string | null {
  if (!secret || !/^[0-9a-f-]{20,64}$/i.test(sessionId)) return null;
  const day = now.toISOString().slice(0, 10);
  return crypto.createHmac("sha256", secret).update(`analytics-session|${day}|${sessionId}`).digest("hex");
}

export function classifyTrafficSource(input: { utmSource?: string | null; referrerHost?: string | null }): string {
  const explicit = sanitizeAnalyticsToken(input.utmSource);
  if (explicit) return explicit;
  const host = (input.referrerHost || "").toLowerCase();
  if (!host) return "direct";
  if (host === "joinaireligion.com" || host.endsWith(".joinaireligion.com")) return "internal";
  if (host.includes("instagram.com")) return "instagram";
  if (host.includes("facebook.com") || host === "fb.com") return "facebook";
  if (host.includes("threads.net")) return "threads";
  if (host === "t.co" || host.includes("x.com") || host.includes("twitter.com")) return "x";
  if (host.includes("linkedin.com")) return "linkedin";
  if (host.includes("bsky.app")) return "bluesky";
  if (host.includes("mastodon")) return "mastodon";
  if (host.includes("pinterest.")) return "pinterest";
  if (host.includes("google.")) return "google";
  if (host.includes("bing.com")) return "bing";
  if (host.includes("duckduckgo.com")) return "duckduckgo";
  return "referral";
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function ranked(values: Iterable<string>, limit = 10, minimum = 1): RankedMetric[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()]
    .filter(([, count]) => count >= minimum)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

export function aggregateTrafficRows(
  rows: AnalyticsEventRow[],
  from: Date,
  to: Date,
  options: { sampled?: boolean; countryMinimum?: number } = {},
): TrafficSummary {
  const productionRows = rows.filter((row) => sanitizeAnalyticsToken(record(row.metadata).source) !== "deployment_verification");
  const ordered = [...productionRows].sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  const pageViews = ordered.filter((row) => row.eventName === "analytics_page_view");
  const clicks = ordered.filter((row) => row.eventName === "analytics_link_click");
  const sessionRows = pageViews.filter((row) => row.anonymousSessionId);
  const sessionIds = new Set(sessionRows.map((row) => row.anonymousSessionId as string));
  const firstBySession = new Map<string, AnalyticsEventRow>();
  for (const row of sessionRows) {
    if (!firstBySession.has(row.anonymousSessionId as string)) firstBySession.set(row.anonymousSessionId as string, row);
  }
  const landingRows = [...firstBySession.values()];
  const sourceByLocale = new Map<string, number>();
  for (const row of landingRows) {
    const metadata = record(row.metadata);
    const source = sanitizeAnalyticsToken(metadata.source) || "unknown";
    const locale = sanitizeAnalyticsToken(metadata.locale, 8) || "unknown";
    const key = `${source}\u0000${locale}`;
    sourceByLocale.set(key, (sourceByLocale.get(key) || 0) + 1);
  }

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    pageViews: pageViews.length,
    sessions: sessionIds.size,
    linkClicks: clicks.length,
    registrationClicks: clicks.filter((row) => record(row.metadata).targetPath === "/register").length,
    topSources: ranked(landingRows.map((row) => sanitizeAnalyticsToken(record(row.metadata).source) || "unknown")),
    topLandingPages: ranked(landingRows.map((row) => row.path || "/")),
    topPages: ranked(pageViews.map((row) => row.path || "/")),
    topCountries: ranked(
      landingRows.flatMap((row) => {
        const country = normalizeCountryCode(record(row.metadata).country);
        return country ? [country] : [];
      }),
      12,
      options.countryMinimum ?? 5,
    ),
    topLocales: ranked(landingRows.map((row) => sanitizeAnalyticsToken(record(row.metadata).locale, 8) || "unknown")),
    sourceByLocale: [...sourceByLocale.entries()]
      .filter(([, sessions]) => sessions >= 3)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 30)
      .map(([key, sessions]) => {
        const [source, locale] = key.split("\u0000");
        return { source, locale, sessions };
      }),
    excludedVerificationEvents: rows.length - productionRows.length,
    sampled: Boolean(options.sampled),
    containsUserLevelData: false,
  };
}

export function buildAttributedUrl(canonicalUrl: string, provider: string, campaign: string): string {
  const url = new URL(canonicalUrl);
  url.searchParams.set("utm_source", sanitizeAnalyticsToken(provider) || "social");
  url.searchParams.set("utm_medium", "social");
  url.searchParams.set("utm_campaign", sanitizeAnalyticsToken(campaign) || "organic_content");
  return url.toString();
}

export function selectMeasuredLocale(
  summary: Pick<TrafficSummary, "sourceByLocale"> | null,
  source: string,
  availableLocales: readonly string[],
  minimumSessions = 20,
): string | null {
  if (!summary) return null;
  const available = new Set(availableLocales);
  const rows = summary.sourceByLocale
    .filter((row) => row.source === source && available.has(row.locale))
    .sort((left, right) => right.sessions - left.sessions || left.locale.localeCompare(right.locale));
  const total = rows.reduce((sum, row) => sum + row.sessions, 0);
  if (total < minimumSessions || rows.length === 0) return null;
  const leader = rows[0];
  const runnerUp = rows[1]?.sessions || 0;
  if (leader.sessions / total < 0.6 || (runnerUp > 0 && leader.sessions < runnerUp * 1.25)) return null;
  return leader.locale;
}
