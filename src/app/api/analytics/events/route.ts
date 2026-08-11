export const dynamic = "force-dynamic";

import { ActivityEventType } from "@prisma/client";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import {
  classifyTrafficSource,
  dailySessionHash,
  normalizeCountryCode,
  sanitizeAnalyticsPath,
  sanitizeAnalyticsToken,
  sanitizeReferrerHost,
} from "@/lib/analytics/core";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const EVENTS = new Set(["page_view", "link_click"]);
const BOT_PATTERN = /bot|crawler|spider|slurp|headless|lighthouse|preview/i;

function isAllowedOrigin(request: NextRequest, origin: string): boolean {
  const allowed = new Set([new URL(request.url).origin]);
  try { allowed.add(new URL(env.NEXT_PUBLIC_APP_URL).origin); } catch { /* forwarded origin remains available */ }
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host"))?.split(",")[0]?.trim();
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (host && proto) allowed.add(`${proto}://${host}`);
  return allowed.has(origin);
}

function trustedCountry(request: NextRequest): string | null {
  if (env.ANALYTICS_TRUSTED_COUNTRY_HEADERS !== "true") return null;
  return normalizeCountryCode(request.headers.get("cf-ipcountry") || request.headers.get("x-vercel-ip-country"));
}

export async function POST(request: NextRequest): Promise<Response> {
  const origin = request.headers.get("origin");
  if (!origin || !isAllowedOrigin(request, origin)) return Response.json({ error: "Invalid origin" }, { status: 403 });
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return Response.json({ error: "Unsupported content type" }, { status: 415 });
  }
  if (BOT_PATTERN.test(request.headers.get("user-agent") || "")) return new Response(null, { status: 204 });

  const limit = checkRateLimit(`analytics:${getClientIp(request)}`, { limit: 180, windowMs: 60 * 60_000 });
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter);

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const event = typeof body?.event === "string" ? body.event : "";
  const path = sanitizeAnalyticsPath(body?.path);
  if (!EVENTS.has(event) || !path || path.startsWith("/admin") || path.startsWith("/api")) {
    return Response.json({ error: "Invalid analytics event" }, { status: 400 });
  }

  const referrerHost = sanitizeReferrerHost(body?.referrerHost);
  const source = classifyTrafficSource({
    utmSource: sanitizeAnalyticsToken(body?.source),
    referrerHost,
  });
  const now = new Date();
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
  const anonymousSessionId = dailySessionHash(sessionId, now, env.ANALYTICS_HASH_SECRET || env.CRON_SECRET);
  const targetPath = sanitizeAnalyticsPath(body?.targetPath);
  const targetHost = sanitizeReferrerHost(body?.targetHost);

  await db.userActivityLog.create({
    data: {
      eventType: ActivityEventType.SYSTEM,
      eventName: `analytics_${event}`,
      anonymousSessionId,
      path,
      method: "POST",
      metadata: {
        source,
        medium: sanitizeAnalyticsToken(body?.medium),
        campaign: sanitizeAnalyticsToken(body?.campaign),
        referrerHost,
        country: trustedCountry(request),
        locale: sanitizeAnalyticsToken(body?.locale, 8) || "en",
        targetPath,
        targetHost,
        privacy: "daily-session-hash_no-raw-ip_no-query-string_no-user-agent",
      },
      ipHash: null,
      userAgent: null,
    },
  });

  return Response.json({ ok: true }, { status: 201 });
}
