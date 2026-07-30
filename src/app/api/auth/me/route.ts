import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveSubscriptionPlan } from "@/lib/membership";
import { levelForXp } from "@/lib/journey-types";

export async function GET(request: NextRequest) {
  const sessionUser = await getCurrentUserFromRequest(request);
  if (!sessionUser) return NextResponse.json({ user: null }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      emailVerifiedAt: true,
      currentLevel: true,
      xpTotal: true,
      daysActive: true,
      onboardingDone: true,
      unsubscribedAt: true,
      profile: {
        select: {
          bio: true,
          tradition: true,
          country: true,
          city: true,
          phone: true,
          secondaryEmail: true,
          socialMedia: true,
          avatarPath: true,
        },
      },
      subscription: {
        select: {
          status: true,
          planCode: true,
          providerPriceId: true,
          currentPeriodEnd: true,
          trialEndsAt: true,
        },
      },
    },
  });

  if (!user) return NextResponse.json({ user: null }, { status: 401 });

  const subscription = user.subscription
      ? {
        status: user.subscription.status,
        plan: resolveSubscriptionPlan(user.subscription),
        currentPeriodEnd: user.subscription.currentPeriodEnd,
        trialEndsAt: user.subscription.trialEndsAt,
      }
    : null;

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      emailVerifiedAt: user.emailVerifiedAt,
      currentLevel: levelForXp(user.xpTotal),
      xpTotal: user.xpTotal,
      daysActive: user.daysActive,
      onboardingDone: user.onboardingDone,
      requiresOnboarding: !user.onboardingDone,
      unsubscribedAt: user.unsubscribedAt,
      avatarUrl: user.profile?.avatarPath ?? null,
      profile: user.profile,
      subscription,
    },
  });
}
