/**
 * POST /api/practice/respond
 *
 * Saves a user's response to a PracticeMessage.
 *
 * Enforcements:
 *   - Authenticated session required
 *   - User must own the PracticeMessage (userId match)
 *   - One PracticeResponse per PracticeMessage (@@unique enforced at DB +
 *     application layer for a clear error message)
 *   - Response text must not be empty
 *   - Response text must not exceed 3000 characters
 *
 * On success:
 *   - Creates PracticeResponse with score=null, xpEarned=0
 *   - Scoring is deferred to a separate agent/cron (not implemented here)
 *
 * Request body: { messageId: string; responseText: string }
 *
 * Response shapes:
 *   201 { response: { id, xpEarned, createdAt } }
 *   400 Validation error
 *   401 Unauthorized
 *   403 Forbidden (message belongs to another user)
 *   404 Message not found
 *   409 Already responded
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth";

const MAX_RESPONSE_LENGTH = 3000;

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("jair_session")?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { messageId, responseText } =
    (body as { messageId?: unknown; responseText?: unknown }) ?? {};

  // ── Validate inputs ─────────────────────────────────────────────────────────
  if (typeof messageId !== "string" || !messageId.trim()) {
    return NextResponse.json({ error: "messageId is required" }, { status: 400 });
  }

  if (typeof responseText !== "string") {
    return NextResponse.json({ error: "responseText is required" }, { status: 400 });
  }

  const trimmed = responseText.trim();
  if (trimmed.length === 0) {
    return NextResponse.json(
      { error: "Response cannot be empty" },
      { status: 400 }
    );
  }
  if (trimmed.length > MAX_RESPONSE_LENGTH) {
    return NextResponse.json(
      {
        error: `Response is too long. Maximum ${MAX_RESPONSE_LENGTH} characters allowed (received ${trimmed.length}).`,
      },
      { status: 400 }
    );
  }

  // ── Fetch message and verify ownership ─────────────────────────────────────
  const message = await db.practiceMessage.findUnique({
    where: { id: messageId },
    select: { id: true, userId: true },
  });

  if (!message) {
    return NextResponse.json({ error: "Practice message not found" }, { status: 404 });
  }

  if (message.userId !== session.userId) {
    return NextResponse.json(
      { error: "You do not have permission to respond to this message" },
      { status: 403 }
    );
  }

  // ── Duplicate guard (application-level check for a clear 409) ──────────────
  const existing = await db.practiceResponse.findUnique({
    where: {
      userId_practiceMessageId: {
        userId: session.userId,
        practiceMessageId: messageId,
      },
    },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json(
      { error: "You have already submitted a response for this practice" },
      { status: 409 }
    );
  }

  // ── Create PracticeResponse ─────────────────────────────────────────────────
  // score and xpEarned are left at their defaults (null / 0).
  // Scoring is handled by a separate agent run.
  const response = await db.practiceResponse.create({
    data: {
      userId: session.userId,
      practiceMessageId: messageId,
      responseText: trimmed,
      score: null,
      xpEarned: 0,
    },
    select: {
      id: true,
      xpEarned: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ response }, { status: 201 });
}
