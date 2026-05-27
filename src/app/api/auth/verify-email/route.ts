import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { token } = await request.json();
    if (!token) return NextResponse.json({ error: "Missing token." }, { status: 400 });

    const rec = await db.emailVerificationToken.findUnique({ where: { token } });
    if (!rec || rec.usedAt || rec.expiresAt < new Date())
      return NextResponse.json({ error: "Invalid or expired token." }, { status: 400 });

    // Mark token used first to prevent replay
    await db.emailVerificationToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } });

    // Verify the user and initialize journey state atomically
    const user = await db.user.update({
      where: { email: rec.email },
      data: {
        emailVerifiedAt: new Date(),
        // Explicitly set journey defaults on first verification
        // These match schema defaults but are set explicitly for clarity and testability
        currentLevel:  1,
        xpTotal:       0,
        daysActive:    0,
        lastLoginAt:   new Date(),
        lastActivityAt: new Date(),
      },
    });

    // Ensure a UserProfile record exists so profile page never errors on first visit
    await db.userProfile.upsert({
      where:  { userId: user.id },
      create: { userId: user.id },
      update: {},  // no-op if already present
    });

    // Auto-login: set session cookie
    const response = NextResponse.json({
      ok: true,
      onboardingDone: user.onboardingDone,
      next: user.onboardingDone ? "/account" : "/onboarding",
    });
    setSessionCookie(response, { userId: user.id, email: user.email, role: user.role });
    return response;
  } catch (error) {
    console.error("verify_email_error", error);
    return NextResponse.json({ error: "Verification failed." }, { status: 500 });
  }
}
