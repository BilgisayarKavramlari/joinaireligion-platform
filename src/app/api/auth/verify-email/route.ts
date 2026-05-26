import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const { token } = await request.json();
  const rec = await db.emailVerificationToken.findUnique({ where: { token } });
  if (!rec || rec.usedAt || rec.expiresAt < new Date()) return NextResponse.json({ error: "Invalid or expired token." }, { status: 400 });
  await db.user.update({ where: { email: rec.email }, data: { emailVerifiedAt: new Date() } });
  await db.emailVerificationToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
