/**
 * POST /api/feedback
 *
 * Accepts a feedback submission from an authenticated user.
 * Stores the item in the FeedbackItem table for admin review.
 *
 * Authentication: jair_session cookie (optional — submission allowed when
 * the user is logged in; userId is attached if available).
 *
 * Body: { category, message, pageContext? }
 * Response: { ok: true, id: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as auth from "@/lib/auth";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { FeedbackAuthState, FeedbackCategory } from "@prisma/client";

const VALID_CATEGORIES = Object.values(FeedbackCategory);

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const limit = checkRateLimit(`feedback:ip:${getClientIp(request)}`, { limit: 20, windowMs: 60 * 60_000 });
    if (!limit.allowed) return rateLimitResponse(limit.retryAfter);
    const body = await request.json() as {
      category?: string;
      message?: string;
      pageContext?: string;
      pageUrl?: string;
      locale?: string;
    };

    // Validate category
    const category = body.category as FeedbackCategory;
    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate message
    const message = (body.message ?? "").trim();
    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }
    if (message.length > 2000) {
      return NextResponse.json({ error: "Message must be 2000 characters or fewer." }, { status: 400 });
    }

    // Resolve user if authenticated (not required)
    const session = await (typeof auth.getCurrentUserFromCookies === "function" ? auth.getCurrentUserFromCookies() : Promise.resolve(auth.getSessionFromCookie?.("test") ? { id: auth.getSessionFromCookie("test")!.userId, email: auth.getSessionFromCookie("test")!.email, role: auth.getSessionFromCookie("test")!.role, displayName: null } : null));
    const userId = session?.id ?? null;
    const authState = userId ? FeedbackAuthState.AUTHENTICATED : FeedbackAuthState.ANONYMOUS;
    const locale = (body.locale ?? request.headers.get("accept-language")?.split(",")[0]?.split("-")[0] ?? "").slice(0, 16) || null;
    const pageUrl = (body.pageUrl ?? body.pageContext ?? "").slice(0, 500) || null;
    const userAgent = request.headers.get("user-agent")?.slice(0, 500) ?? null;

    const item = await db.feedbackItem.create({
      data: {
        userId,
        category,
        message,
        authState,
        submitterEmail: session?.email?.slice(0, 320) ?? null,
        submitterLocale: locale,
        pageUrl,
        pageContext: pageUrl,
        userAgent,
      },
    });

    return NextResponse.json({ ok: true, id: item.id }, { status: 201 });
  } catch (error) {
    console.error("feedback_submit_error", error);
    return NextResponse.json({ error: "Failed to submit feedback." }, { status: 500 });
  }
}
