import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { recordReflectionFeedback } from "@/lib/reflection-abuse";
import { isSameOriginReflectionRequest } from "@/lib/reflection-companion";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  if (!isSameOriginReflectionRequest(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return NextResponse.json({ error: "Unsupported content type." }, { status: 415 });
  const user = await getCurrentUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const limit = checkRateLimit(`reflection:feedback:${user.id}`, { limit: 30, windowMs: 86_400_000 });
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter);
  const body = await request.json().catch(() => null) as { conversationId?: unknown; useful?: unknown } | null;
  if (!body || typeof body.conversationId !== "string" || !UUID_RE.test(body.conversationId) || typeof body.useful !== "boolean") {
    return NextResponse.json({ error: "Invalid feedback." }, { status: 400 });
  }
  const dialogue = await db.aiDialogue.findFirst({ where: { userId: user.id, conversationId: body.conversationId }, select: { id: true } });
  if (!dialogue) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  await recordReflectionFeedback({ userId: user.id, conversationId: body.conversationId, useful: body.useful });
  return NextResponse.json({ ok: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
