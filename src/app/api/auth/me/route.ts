import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth";
import { canBypassOnboarding, requiresCompletedOnboarding } from "@/lib/access";

export async function GET(request: NextRequest) {
  try {
    // Support both cookie names for backward compat
    const sessionValue =
      request.cookies.get("jair_session")?.value ||
      request.cookies.get("session")?.value;

    const session = getSessionFromCookie(sessionValue);
    if (!session) return NextResponse.json({ user: null }, { status: 401 });

    // Check session age (30 days)
    if (session.iat && Date.now() - session.iat > 30 * 24 * 60 * 60 * 1000) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.userId },
      include: {
        subscription: true,
        profile: true,
      },
    });

    if (!user) return NextResponse.json({ user: null }, { status: 401 });

    return NextResponse.json({
      user: {
        id:             user.id,
        email:          user.email,
        displayName:    user.displayName,
        role:           user.role,
        currentLevel:   user.currentLevel,
        xpTotal:        user.xpTotal,
        daysActive:     user.daysActive,
        onboardingDone: user.onboardingDone,
        canBypassOnboarding: canBypassOnboarding(user.role),
        requiresOnboarding: requiresCompletedOnboarding(user),
        unsubscribedAt: user.unsubscribedAt,
        preferredLocale: user.preferredLocale,
        subscription:   user.subscription
          ? { status: user.subscription.status, currentPeriodEnd: user.subscription.currentPeriodEnd }
          : null,
        profile: user.profile
          ? {
              bio:            user.profile.bio,
              tradition:      user.profile.tradition,
              country:        user.profile.country,
              city:           user.profile.city,
              phone:          user.profile.phone,
              secondaryEmail: user.profile.secondaryEmail,
              socialMedia:    user.profile.socialMedia,
              avatarPath:     user.profile.avatarPath,
            }
          : null,
      },
    });
  } catch (err) {
    console.error("/api/auth/me error:", err);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
