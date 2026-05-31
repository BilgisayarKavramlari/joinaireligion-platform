import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { STEP1_LESSON } from "@/lib/lesson-defaults";
import { enforceLearningAccess } from "@/lib/access";

export async function GET() {
  try {
    const access = await enforceLearningAccess();
    if (!access.ok) return access.response;

    const userId = access.user.id;

    // Get user's existing UserLessons with lesson data
    const userLessons = await db.userLesson.findMany({
      where: { userId },
      include: {
        lesson: true,
        attempts: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { lesson: { stepNumber: "asc" } },
    });

    // If no lessons yet, ensure the Step 1 template exists (self-healing) and
    // create a UserLesson for this user pointing to it.
    if (userLessons.length === 0) {
      // Find or create the Step 1 template lesson — this is the self-healing path
      // for environments where `prisma db seed` has not yet been executed.
      let step1 = await db.lesson.findFirst({
        where: { stepNumber: 1, isTemplate: true, forUserId: null },
      });

      if (!step1) {
        // Template not seeded — create it inline so new users always get a lesson.
        step1 = await db.lesson.create({
          data: {
            ...STEP1_LESSON,
            isTemplate: true,
            forUserId: null,
            questions: STEP1_LESSON.questions as object,
          },
        });
      }

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
