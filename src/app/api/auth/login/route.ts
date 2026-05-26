import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    const user = await db.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash || user.passwordHash !== hashPassword(password || "")) return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    if (!user.emailVerifiedAt) return NextResponse.json({ error: "Please verify your email before login.", needsVerification: true }, { status: 403 });
    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), lastActivityAt: new Date() } });
    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email } });
  } catch { return NextResponse.json({ error: "Login failed." }, { status: 500 }); }
}
