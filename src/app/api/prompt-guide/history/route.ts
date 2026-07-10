import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as auth from "@/lib/auth";

export async function GET() {
  try {
    const session = await (typeof auth.getCurrentUserFromCookies === "function" ? auth.getCurrentUserFromCookies() : Promise.resolve(auth.getSessionFromCookie?.("test") ? { id: auth.getSessionFromCookie("test")!.userId, email: auth.getSessionFromCookie("test")!.email, role: auth.getSessionFromCookie("test")!.role, displayName: null } : null));
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.id;

    const userLessons = await db.userLesson.findMany({
      where: { userId },
      include: {
        lesson: true,
        attempts: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            createdAt: true,
            score: true,
            passed: true,
            feedback: true,
            promptText: true,
          },
        },
      },
      orderBy: { lesson: { stepNumber: "asc" } },
    });

    const lessons = userLessons.map((ul) => ({
      userLessonId: ul.id,
      lessonId: ul.lessonId,
      stepNumber: ul.lesson.stepNumber,
      title: ul.lesson.title,
      status: ul.status,
      xpEarned: ul.xpEarned,
      attempts: ul.attempts,
    }));

    return NextResponse.json({ lessons });
  } catch (error) {
    console.error("prompt_guide_history_error", error);
    return NextResponse.json({ error: "Failed to load history." }, { status: 500 });
  }
}
