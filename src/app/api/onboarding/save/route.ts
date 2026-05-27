import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth";
import { sendFirstLessonEmail } from "@/lib/email";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = getSessionFromCookie(cookieStore.get("jair_session")?.value);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { answers } = await req.json() as { answers: Record<string, string> };
    if (!answers || typeof answers !== "object")
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const userId = session.userId;

    // ── 1. Persist onboarding answers ─────────────────────────────────────────
    const rows = Object.entries(answers)
      .filter(([, v]) => v?.trim())
      .map(([questionKey, answer]) => ({ userId, questionKey, answer: answer.trim() }));

    if (rows.length > 0) {
      await db.onboardingAnswer.createMany({ data: rows, skipDuplicates: true });
    }

    // ── 2. Denormalise tradition + preferred locale into UserProfile / User ────
    const tradition      = answers["tradition"] || null;
    const preferredLocale = answers["preferred_language"] || null;

    await db.userProfile.upsert({
      where:  { userId },
      update: { tradition: tradition ?? undefined },
      create: { userId, tradition },
    });

    if (preferredLocale) {
      await db.user.update({ where: { id: userId }, data: { preferredLocale } });
    }

    // ── 3. Mark onboarding complete ────────────────────────────────────────────
    const updatedUser = await db.user.update({
      where: { id: userId },
      data:  { onboardingDone: true, onboardingDoneAt: new Date() },
    });

    // ── 4. Eagerly create Step 1 UserLesson (Phase 3 requirement) ─────────────
    // Find the canonical template lesson for Step 1
    const step1Lesson = await db.lesson.findFirst({
      where: { stepNumber: 1, isTemplate: true, forUserId: null },
    });

    if (step1Lesson) {
      // Upsert so re-runs of onboarding (edge-case) never duplicate
      await db.userLesson.upsert({
        where:  { userId_lessonId: { userId, lessonId: step1Lesson.id } },
        create: { userId, lessonId: step1Lesson.id, status: "PENDING" },
        update: {},   // no-op if already present
      });
    }

    // ── 5. Fire first-lesson email (non-blocking, includes lesson content) ─────
    sendFirstLessonEmail(
      updatedUser.email,
      userId,
      updatedUser.displayName,
      step1Lesson ?? undefined,
    ).catch(console.error);

    return NextResponse.json({ ok: true, next: "/lessons" });
  } catch (error) {
    console.error("onboarding_save_error", error);
    return NextResponse.json({ error: "Failed to save." }, { status: 500 });
  }
}
