import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const session = getSessionFromCookie(cookieStore.get("jair_session")?.value);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.userId;

    const lesson = await db.lesson.findUnique({ where: { id } });
    if (!lesson) return NextResponse.json({ error: "Not found" }, { status: 404 });

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

    const isPaid = user?.subscription?.status === "ACTIVE";
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
          if (isPaid) {
            // Paid: reset daily
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            reason = "You've used your prompt attempt for today. Come back tomorrow.";
            nextAvailableAt = tomorrow.toISOString();
          } else {
            reason = `You've used your free attempt this week. Upgrade to Initiate for daily access, or return ${periodEnd.toLocaleDateString()}.`;
            nextAvailableAt = periodEnd.toISOString();
          }
        }
      }
    }

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error("lesson_get_error", error);
    return NextResponse.json({ error: "Failed to load lesson." }, { status: 500 });
  }
}
