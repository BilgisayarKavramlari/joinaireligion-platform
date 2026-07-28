export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { SUPPORTED_CONTENT_LOCALES, type SupportedContentLocale } from "@/lib/growth-agents/content";

const EVENTS = ["view", "like", "dislike", "dwell", "cta"] as const;
type EngagementEvent = (typeof EVENTS)[number];

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await context.params;
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as { event?: unknown; locale?: unknown; seconds?: unknown } | null;
  const event = body?.event as EngagementEvent;
  const locale = typeof body?.locale === "string" ? body.locale : "en";
  if (!EVENTS.includes(event) || !SUPPORTED_CONTENT_LOCALES.includes(locale as SupportedContentLocale)) {
    return Response.json({ error: "Invalid engagement event" }, { status: 400 });
  }

  const ip = getClientIp(request);
  const dailyEvent = event === "like" || event === "dislike" || event === "view";
  const limit = checkRateLimit(`content:${id}:${ip}:${event === "like" || event === "dislike" ? "vote" : event}`, {
    limit: dailyEvent ? 1 : 10,
    windowMs: dailyEvent ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000,
  });
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter);

  const content = await db.contentItem.findFirst({ where: { id, status: "PUBLISHED" }, select: { id: true } });
  if (!content) return Response.json({ error: "Content not found" }, { status: 404 });

  const seconds = Math.min(600, Math.max(0, Number(body?.seconds) || 0));
  await db.contentFeedbackMetric.create({
    data: {
      contentItemId: id,
      locale,
      views: event === "view" ? 1 : 0,
      uniqueViews: event === "view" ? 1 : 0,
      likes: event === "like" ? 1 : 0,
      dislikes: event === "dislike" ? 1 : 0,
      dwellSeconds: event === "dwell" ? Math.round(seconds) : 0,
      ctaClicks: event === "cta" ? 1 : 0,
    },
  });
  const totals = await db.contentFeedbackMetric.aggregate({ where: { contentItemId: id }, _sum: { likes: true } });
  return Response.json({ ok: true, likes: totals._sum.likes || 0 });
}
