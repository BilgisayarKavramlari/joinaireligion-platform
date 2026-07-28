import { NextResponse } from "next/server";
import * as auth from "@/lib/auth";
import { db } from "@/lib/db";

export async function getCurrentUser() {
  if (typeof auth.getCurrentUserFromCookies === "function") return auth.getCurrentUserFromCookies();
  const legacy = auth.getSessionFromCookie?.("test");
  return legacy ? { id: legacy.userId, email: legacy.email, role: legacy.role, displayName: null, emailVerifiedAt: new Date() } : null;
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function enforceLearningAccess() {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const account = await db.user.findUnique({
    where: { id: user.id },
    select: { emailVerifiedAt: true, onboardingDone: true, role: true },
  });
  if (!account) return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!account.emailVerifiedAt) return { ok: false as const, response: NextResponse.json({ error: "Email verification required" }, { status: 403 }) };
  if (!account.onboardingDone && account.role !== "ADMIN" && account.role !== "SUPER_ADMIN") {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Onboarding required", code: "ONBOARDING_REQUIRED", next: "/onboarding" },
        { status: 403 },
      ),
    };
  }

  return { ok: true as const, user: { ...user, ...account } };
}
