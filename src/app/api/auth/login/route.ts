import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, startSession, verifyPassword } from "@/lib/auth";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();

    const ipLimit = checkRateLimit(`auth:login:ip:${getClientIp(request)}`, { limit: 10, windowMs: 15 * 60_000 });
    const emailLimit = checkRateLimit(`auth:login:email:${normalizedEmail}`, { limit: 8, windowMs: 15 * 60_000 });
    if (!ipLimit.allowed || !emailLimit.allowed) return rateLimitResponse(Math.max(ipLimit.retryAfter, emailLimit.retryAfter));

    const user = await db.user.findUnique({ where: { email: normalizedEmail }, include: { subscription: true } });
    const passwordCheck = await verifyPassword(String(password || ""), user?.passwordHash);

    if (!user || !passwordCheck.valid) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    if (!user.emailVerifiedAt) {
      return NextResponse.json({ error: "Please verify your email before login.", needsVerification: true }, { status: 403 });
    }

    const updates: { lastLoginAt: Date; lastActivityAt: Date; passwordHash?: string } = {
      lastLoginAt: new Date(),
      lastActivityAt: new Date(),
    };
    if (passwordCheck.needsRehash) updates.passwordHash = await hashPassword(String(password));

    await db.user.update({ where: { id: user.id }, data: updates });

    const response = NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
    });
    await startSession(response, user.id);
    return response;
  } catch (err) {
    console.error("Login error:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}
