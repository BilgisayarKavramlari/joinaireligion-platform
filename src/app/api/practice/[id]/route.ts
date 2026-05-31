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
import { db } from "@/lib/db";
import { enforceLearningAccess } from "@/lib/access";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const access = await enforceLearningAccess();
  if (!access.ok) return access.response;

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
  if (message.userId !== access.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Existing response ───────────────────────────────────────────────────────
  const existingResponse = await db.practiceResponse.findUnique({
    where: {
      userId_practiceMessageId: {
        userId: access.user.id,
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
