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

    // ── 2. Denormalise personalization fields into UserProfile / User ────────────
    const tradition       = answers["tradition"] || null;
    const preferredLocale = answers["preferred_language"] || null;
    // intent: extract the short label before the first " — " separator
    const intentRaw = answers["intent"] || null;
    const intent    = intentRaw
      ? intentRaw.split(" — ")[0].replace(/All of the above.*/i, "Open exploration").trim()
      : null;
    // email cadence consent → map to emailOptIn boolean
    const cadenceAnswer   = answers["email_cadence_consent"] || "";
    const emailOptIn      = cadenceAnswer.startsWith("Daily") || cadenceAnswer.startsWith("Weekly");

    await db.userProfile.upsert({
      where:  { userId },
      update: {
        tradition: tradition ?? undefined,
        intent:    intent    ?? undefined,
      },
      create: { userId, tradition, intent },
    });

    const userUpdates: Record<string, unknown> = {};
    if (preferredLocale) userUpdates.preferredLocale = preferredLocale;
    // Only update emailOptIn if user explicitly answered (don't downgrade existing true)
    if (cadenceAnswer) userUpdates.emailOptIn = emailOptIn;
    if (Object.keys(userUpdates).length > 0) {
      await db.user.update({ where: { id: userId }, data: userUpdates });
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
