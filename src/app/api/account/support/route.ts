import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionValue =
      cookieStore.get("jair_session")?.value ||
      cookieStore.get("session")?.value;
    const session = getSessionFromCookie(sessionValue);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tickets = await db.feedbackItem.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        category: true,
        status: true,
        message: true,
        createdAt: true,
        supportReplies: {
          where: {
            visibility: "USER_VISIBLE",
            status: { in: ["APPROVED", "SENT"] },
          },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            status: true,
            body: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({
      tickets: tickets.map((ticket) => ({
        ...ticket,
        supportReplies: ticket.supportReplies.map((reply) => ({
          ...reply,
          createdAt: reply.createdAt.toISOString(),
        })),
        createdAt: ticket.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("account_support_history_error", error);
    return NextResponse.json({ error: "Failed to load support history." }, { status: 500 });
  }
}
