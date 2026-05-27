import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = getSessionFromCookie(cookieStore.get("jair_session")?.value);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.userId;

    // Get user's existing UserLessons with lesson data
    const userLessons = await db.userLesson.findMany({
      where: { userId },
      include: {
        lesson: true,
        attempts: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { lesson: { stepNumber: "asc" } },
    });

    // If no lessons yet, create UserLesson for step 1 template
    if (userLessons.length === 0) {
      const step1 = await db.lesson.findFirst({
        where: { stepNumber: 1, isTemplate: true, forUserId: null },
      });
      if (step1) {
        const ul = await db.userLesson.create({
          data: { userId, lessonId: step1.id, status: "PENDING" },
          include: { lesson: true, attempts: true },
        });
        return NextResponse.json({
          lessons: [{
            userLessonId: ul.id,
            lessonId: ul.lessonId,
            stepNumber: ul.lesson.stepNumber,
            title: ul.lesson.title,
            status: ul.status,
            xpEarned: ul.xpEarned,
            lastScore: undefined,
          }],
        });
      }
      return NextResponse.json({ lessons: [] });
    }

    const lessons = userLessons.map((ul) => ({
      userLessonId: ul.id,
      lessonId: ul.lessonId,
      stepNumber: ul.lesson.stepNumber,
      title: ul.lesson.title,
      status: ul.status,
      xpEarned: ul.xpEarned,
      lastScore: ul.attempts[0]?.score,
    }));

    return NextResponse.json({ lessons });
  } catch (error) {
    console.error("lessons_list_error", error);
    return NextResponse.json({ error: "Failed to load lessons." }, { status: 500 });
  }
}
