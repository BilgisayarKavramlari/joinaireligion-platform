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
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth";
import { FeedbackCategory } from "@prisma/client";

const VALID_CATEGORIES = Object.values(FeedbackCategory);

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as {
      category?: string;
      message?: string;
      pageContext?: string;
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
    const cookieStore = await cookies();
    const session = getSessionFromCookie(cookieStore.get("jair_session")?.value);
    const userId = session?.userId ?? null;

    const item = await db.feedbackItem.create({
      data: {
        userId,
        category,
        message,
        pageContext: (body.pageContext ?? "").slice(0, 500) || null,
      },
    });

    return NextResponse.json({ ok: true, id: item.id }, { status: 201 });
  } catch (error) {
    console.error("feedback_submit_error", error);
    return NextResponse.json({ error: "Failed to submit feedback." }, { status: 500 });
  }
}
