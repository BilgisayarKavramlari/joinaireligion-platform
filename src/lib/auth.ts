import crypto from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const hashPassword = (password: string) => crypto.createHash("sha256").update(password).digest("hex");
export const createToken = () => crypto.randomBytes(24).toString("hex");

export async function createVerification(email: string) {
  const token = createToken();
  await db.emailVerificationToken.create({ data: { email, token, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24) } });
  return token;
}

export function setSessionCookie(
  response: NextResponse,
  payload: { userId: string; email: string; role: string },
) {
  const value = Buffer.from(JSON.stringify({ ...payload, iat: Date.now() })).toString("base64");
  response.cookies.set("jair_session", value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
}

export function getSessionFromCookie(cookieValue: string | undefined) {
  if (!cookieValue) return null;
  try {
    return JSON.parse(Buffer.from(cookieValue, "base64").toString("utf-8")) as {
      userId: string; email: string; role: string; iat: number;
    };
  } catch {
    return null;
  }
}
