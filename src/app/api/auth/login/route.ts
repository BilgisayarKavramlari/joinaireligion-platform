import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    const user = await db.user.findUnique({
      where: { email },
      include: { subscription: true },
    });

    if (!user || !user.passwordHash || user.passwordHash !== hashPassword(password || "")) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    if (!user.emailVerifiedAt) {
      return NextResponse.json({ error: "Please verify your email before login.", needsVerification: true }, { status: 403 });
    }

    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastActivityAt: new Date() },
    });

    // Simple session cookie — base64 encoded JSON payload
    const sessionPayload = Buffer.from(JSON.stringify({
      userId: user.id,
      email:  user.email,
      role:   user.role,
      iat:    Date.now(),
    })).toString("base64");

    const response = NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
    });

    // 30-day session
    response.cookies.set("session", sessionPayload, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   60 * 60 * 24 * 30,
      path:     "/",
    });

    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}
