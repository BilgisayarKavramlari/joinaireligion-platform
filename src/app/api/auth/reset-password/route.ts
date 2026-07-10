import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, hashToken } from "@/lib/auth";

export async function POST(request: Request) {
  const { token, password } = await request.json();
  if (!token || !password || password.length < 12) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const prt = await db.passwordResetToken.findUnique({ where: { token: hashToken(String(token)) } });
  if (!prt || prt.usedAt || prt.expiresAt < new Date()) return NextResponse.json({ error: "Token invalid or expired." }, { status: 400 });
  await db.$transaction([
    db.user.update({ where: { email: prt.email }, data: { passwordHash: await hashPassword(password) } }),
    db.passwordResetToken.update({ where: { id: prt.id }, data: { usedAt: new Date() } }),
  ]);
  return NextResponse.json({ ok: true });
}
