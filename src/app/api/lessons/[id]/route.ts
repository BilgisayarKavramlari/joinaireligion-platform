import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enforceLearningAccess } from "@/lib/access";
import { resolveEntitlements } from "@/lib/membership";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await enforceLearningAccess();
    if (!access.ok) return access.response;

    const userId = access.user.id;

    const lesson = await db.lesson.findUnique({ where: { id } });
    if (!lesson) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (lesson.forUserId && lesson.forUserId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Get or create UserLesson
    let userLesson = await db.userLesson.findUnique({ where: { userId_lessonId: { userId, lessonId: id } } });
    if (!userLesson) {
      userLesson = await db.userLesson.create({ data: { userId, lessonId: id, status: "IN_PROGRESS", startedAt: new Date() } });
    } else if (userLesson.status === "PENDING") {
      userLesson = await db.userLesson.update({ where: { id: userLesson.id }, data: { status: "IN_PROGRESS", startedAt: new Date() } });
    }

    // Last attempt
    const lastAttempt = await db.lessonAttempt.findFirst({
      where: { userLessonId: userLesson.id },
      orderBy: { createdAt: "desc" },
    });

    // Quota check
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { lessonQuota: true, subscription: true },
    });

    const hasDailyAccess = resolveEntitlements(user?.subscription).dailyLessonAttempt;
    const now = new Date();
    let canSubmit = true;
    let reason = "";
    let nextAvailableAt: string | undefined;

    if (userLesson.status === "COMPLETED") {
      canSubmit = false;
      reason = "You have already completed this lesson.";
    } else {
      const quota = user?.lessonQuota;
      if (quota) {
        const periodEnd = new Date(quota.periodEnd);
        if (quota.usedAttempts >= quota.maxAttempts && now < periodEnd) {
          canSubmit = false;
          nextAvailableAt = periodEnd.toISOString();
          if (hasDailyAccess) {
            reason = "You've used your daily prompt attempt. The countdown shows when your 24-hour period ends.";
          } else {
            reason = `You've used your free attempt this week. Upgrade to Initiate for daily access, or return ${periodEnd.toLocaleDateString()}.`;
          }
        }
      }
    }

    return NextResponse.json(
      {
        id: lesson.id,
        stepNumber: lesson.stepNumber,
        title: lesson.title,
        tradition: lesson.tradition,
        readingText: lesson.readingText,
        practiceDescription: lesson.practiceDescription,
        questions: lesson.questions,
        userLesson: {
          id: userLesson.id,
          status: userLesson.status,
          xpEarned: userLesson.xpEarned,
        },
        lastAttempt: lastAttempt ? {
          score: lastAttempt.score,
          passed: lastAttempt.passed,
          feedback: lastAttempt.feedback || "",
        } : null,
        quota: { canSubmit, reason, nextAvailableAt },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("lesson_get_error", error);
    return NextResponse.json({ error: "Failed to load lesson." }, { status: 500 });
  }
}
