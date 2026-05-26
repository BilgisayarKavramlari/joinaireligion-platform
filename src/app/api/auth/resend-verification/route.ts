import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createVerification } from "@/lib/auth";

export async function POST(request: Request) {
  const { email } = await request.json();
  const user = email ? await db.user.findUnique({ where: { email } }) : null;
  if (!user) return NextResponse.json({ ok: true });
  if (user.emailVerifiedAt) return NextResponse.json({ ok: true, alreadyVerified: true });
  await createVerification(email);
  return NextResponse.json({ ok: true });
}
