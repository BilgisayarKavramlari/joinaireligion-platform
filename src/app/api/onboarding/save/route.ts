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

    // Save all answers to OnboardingAnswer
    const rows = Object.entries(answers)
      .filter(([, v]) => v?.trim())
      .map(([questionKey, answer]) => ({ userId, questionKey, answer: answer.trim() }));

    if (rows.length > 0) {
      await db.onboardingAnswer.createMany({ data: rows, skipDuplicates: true });
    }

    // Extract tradition from answers to update UserProfile
    const tradition = answers["tradition"] || null;
    if (tradition) {
      await db.userProfile.upsert({
        where: { userId },
        update: { tradition },
        create: { userId, tradition },
      });
    }

    // Mark onboarding done
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { onboardingDone: true, onboardingDoneAt: new Date() },
    });

    // Send first lesson email (non-blocking)
    sendFirstLessonEmail(updatedUser.email, userId, updatedUser.displayName).catch(console.error);

    return NextResponse.json({ ok: true, next: "/lessons" });
  } catch (error) {
    console.error("onboarding_save_error", error);
    return NextResponse.json({ error: "Failed to save." }, { status: 500 });
  }
}
