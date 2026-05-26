import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createToken } from "@/lib/auth";

export async function POST(request: Request) {
  const { email } = await request.json();
  if (email) await db.passwordResetToken.create({ data: { email, token: createToken(), expiresAt: new Date(Date.now() + 3600_000) } });
  return NextResponse.json({ ok: true, message: "If the email exists, reset instructions are prepared." });
}
