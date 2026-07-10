import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createVerification } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const { email } = await request.json();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const ipLimit = checkRateLimit(`auth:resend:ip:${getClientIp(request)}`, { limit: 1000, windowMs: 60 * 60_000 });
  const emailLimit = checkRateLimit(`auth:resend:email:${normalizedEmail}`, { limit: 1000, windowMs: 60 * 60_000 });
  if (!ipLimit.allowed || !emailLimit.allowed) return rateLimitResponse(Math.max(ipLimit.retryAfter, emailLimit.retryAfter));
  const user = normalizedEmail ? await db.user.findUnique({ where: { email: normalizedEmail } }) : null;
  if (!user || user.emailVerifiedAt) return NextResponse.json({ ok: true });
  const token = await createVerification(normalizedEmail);
  const emailResult = await sendVerificationEmail(normalizedEmail, token, user.id);
  return NextResponse.json({ ok: true, emailDelivery: emailResult });
}
