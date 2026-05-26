import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const { token, password } = await request.json();
  if (!token || !password || password.length < 8) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const prt = await db.passwordResetToken.findUnique({ where: { token } });
  if (!prt || prt.usedAt || prt.expiresAt < new Date()) return NextResponse.json({ error: "Token invalid or expired." }, { status: 400 });
  await db.user.update({ where: { email: prt.email }, data: { passwordHash: hashPassword(password) } });
  await db.passwordResetToken.update({ where: { id: prt.id }, data: { usedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
