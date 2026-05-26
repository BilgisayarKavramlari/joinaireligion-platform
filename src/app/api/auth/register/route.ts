import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createVerification, hashPassword } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export async function POST(request: Request) {
  try {
    const { email, password, acceptedTerms, emailOptIn } = await request.json();
    if (!email || !emailRegex.test(email)) return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
    if (!password || password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    if (!acceptedTerms) return NextResponse.json({ error: "You must accept the terms to continue." }, { status: 400 });
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "Email already exists." }, { status: 409 });

    await db.user.create({ data: { email, passwordHash: hashPassword(password), acceptedTermsAt: new Date(), emailOptIn: Boolean(emailOptIn) } });
    const token = await createVerification(email);
    const emailResult = await sendVerificationEmail(email, token);
    return NextResponse.json({ ok: true, next: `/check-email?email=${encodeURIComponent(email)}`, emailDelivery: emailResult });
  } catch (error) {
    console.error("register_error", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
