import { ActivityEventType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const EVENTS = new Set(["view", "start", "complete", "share", "install_success"]);
const LOCALES = new Set(["en", "tr", "es", "de", "fr", "ar", "ru", "zh"]);

export async function POST(request: NextRequest) {
  const limit = checkRateLimit(`meaning-map:${getClientIp(request)}`, { limit: 40, windowMs: 60 * 60_000 });
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter);
  const body = await request.json().catch(() => null);
  const event = typeof body?.event === "string" ? body.event : "";
  const locale = typeof body?.locale === "string" && LOCALES.has(body.locale) ? body.locale : "en";
  if (!EVENTS.has(event)) return NextResponse.json({ error: "Invalid event" }, { status: 400 });

  await db.userActivityLog.create({
    data: {
      eventType: ActivityEventType.SYSTEM,
      eventName: `meaning_map_${event}`,
      path: "/meaning-map",
      method: "POST",
      metadata: { locale, privacy: "no_answers_no_result_no_session_no_ip" },
    },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
