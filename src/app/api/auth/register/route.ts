import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createVerification, hashPassword } from "@/lib/auth";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { sendVerificationEmail } from "@/lib/email";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const { email, password, displayName, acceptedTerms, emailOptIn } = await request.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const ipLimit = checkRateLimit(`auth:register:ip:${getClientIp(request)}`, { limit: 5, windowMs: 60 * 60_000 });
    const emailLimit = checkRateLimit(`auth:register:email:${normalizedEmail}`, { limit: 3, windowMs: 60 * 60_000 });
    if (!ipLimit.allowed || !emailLimit.allowed) return rateLimitResponse(Math.max(ipLimit.retryAfter, emailLimit.retryAfter));

    if (!normalizedEmail || !emailRegex.test(normalizedEmail))
      return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
    if (!password || password.length < 12)
      return NextResponse.json({ error: "Password must be at least 12 characters." }, { status: 400 });
    if (!acceptedTerms)
      return NextResponse.json({ error: "You must accept the terms to continue." }, { status: 400 });

    const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
    if (existing)
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });

    // Create user with Level 1 defaults
    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        displayName: displayName?.trim() || null,
        passwordHash: await hashPassword(password),
        acceptedTermsAt: new Date(),
        emailOptIn: Boolean(emailOptIn),
        currentLevel: 1,
        xpTotal: 0,
        daysActive: 0,
        onboardingDone: false,
        // Nested creates
        profile: { create: {} },
        journeyLevels: {
          create: { level: 1, label: "Seeker" },
        },
        lessonQuota: {
          create: {
            periodStart: new Date(),
            periodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
            usedAttempts: 0,
            maxAttempts: 1, // free: 1/week
          },
        },
        quota: {
          create: {
            periodStart: new Date(),
            periodEnd: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
            usedQueries: 0,
            maxQueries: 3,
          },
        },
      },
    });

    const token = await createVerification(normalizedEmail);
    const emailResult = await sendVerificationEmail(normalizedEmail, token, user.id);

    return NextResponse.json({
      ok: true,
      next: `/check-email?email=${encodeURIComponent(normalizedEmail)}`,
      emailDelivery: emailResult,
    });
  } catch (error) {
    console.error("register_error", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
