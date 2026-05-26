import crypto from "crypto";
import { db } from "@/lib/db";

export const hashPassword = (password: string) => crypto.createHash("sha256").update(password).digest("hex");
export const createToken = () => crypto.randomBytes(24).toString("hex");

export async function createVerification(email: string) {
  const token = createToken();
  await db.emailVerificationToken.create({ data: { email, token, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24) } });
  return token;
}
