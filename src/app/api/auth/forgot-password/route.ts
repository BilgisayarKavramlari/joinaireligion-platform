import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createToken, hashToken } from "@/lib/auth";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const { email } = await request.json();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const ipLimit = checkRateLimit(`auth:forgot:ip:${getClientIp(request)}`, { limit: 1000, windowMs: 60 * 60_000 });
  const emailLimit = checkRateLimit(`auth:forgot:email:${normalizedEmail}`, { limit: 1000, windowMs: 60 * 60_000 });
  if (!ipLimit.allowed || !emailLimit.allowed) return rateLimitResponse(Math.max(ipLimit.retryAfter, emailLimit.retryAfter));
  if (normalizedEmail) {
    const user = await db.user.findUnique({ where: { email: normalizedEmail }, select: { email: true } });
    if (user) {
      const token = createToken();
      await db.passwordResetToken.create({ data: { email: normalizedEmail, token: hashToken(token), expiresAt: new Date(Date.now() + 3600_000) } });
      // Email delivery is intentionally left to the existing product flow; do not log token-bearing URLs here.
    }
  }
  return NextResponse.json({ ok: true, message: "If the email exists, reset instructions are prepared." });
}
