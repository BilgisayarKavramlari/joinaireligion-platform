import { NextResponse } from "next/server";
import * as auth from "@/lib/auth";

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
  if (!user.emailVerifiedAt) return { ok: false as const, response: NextResponse.json({ error: "Email verification required" }, { status: 403 }) };
  return { ok: true as const, user };
}
