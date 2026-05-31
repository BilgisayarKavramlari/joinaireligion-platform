import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth";

export const ONBOARDING_BYPASS_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);

export interface AccessUser {
  id: string;
  email: string;
  role: string;
  emailVerifiedAt: Date | null;
  onboardingDone: boolean;
}

export function canBypassOnboarding(role: string | null | undefined): boolean {
  return Boolean(role && ONBOARDING_BYPASS_ROLES.has(role));
}

export function requiresCompletedOnboarding(
  user: Pick<AccessUser, "role" | "emailVerifiedAt" | "onboardingDone">
): boolean {
  return Boolean(user.emailVerifiedAt && !user.onboardingDone && !canBypassOnboarding(user.role));
}

export async function getAccessUserFromSessionCookie(): Promise<AccessUser | null> {
  const cookieStore = await cookies();
  const sessionValue =
    cookieStore.get("jair_session")?.value ??
    cookieStore.get("session")?.value;
  const session = getSessionFromCookie(sessionValue);

  if (!session) return null;

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      role: true,
      emailVerifiedAt: true,
      onboardingDone: true,
    },
  });

  return user;
}

export async function enforceLearningAccess(): Promise<
  | { ok: true; user: AccessUser }
  | { ok: false; response: NextResponse }
> {
  const user = await getAccessUserFromSessionCookie();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (requiresCompletedOnboarding(user)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Onboarding required",
          code: "ONBOARDING_REQUIRED",
          next: "/onboarding",
        },
        { status: 403 }
      ),
    };
  }

  return { ok: true, user };
}
