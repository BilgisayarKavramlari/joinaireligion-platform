/**
 * GET /api/practice/[id]
 *
 * Returns a PracticeMessage for the authenticated user.
 * Enforces ownership: only the recipient of the message may fetch it.
 *
 * Response shapes:
 *   200 { message, existingResponse }
 *   401 Unauthorized
 *   403 Forbidden (message belongs to another user)
 *   404 Not found
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("jair_session")?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // ── Fetch message ───────────────────────────────────────────────────────────
  const message = await db.practiceMessage.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      cadence: true,
      scheduledDate: true,
      subject: true,
      bodyText: true,
      bodyHtml: true,
      xpReward: true,
      generationStatus: true,
      deliveryStatus: true,
      sentAt: true,
      createdAt: true,
    },
  });

  if (!message) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // ── Ownership ───────────────────────────────────────────────────────────────
  if (message.userId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Existing response ───────────────────────────────────────────────────────
  const existingResponse = await db.practiceResponse.findUnique({
    where: {
      userId_practiceMessageId: {
        userId: session.userId,
        practiceMessageId: id,
      },
    },
    select: {
      id: true,
      responseText: true,
      score: true,
      xpEarned: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ message, existingResponse });
}
