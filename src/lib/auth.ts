import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export const SESSION_COOKIE_NAME = "__Host-jair_session";
export const LEGACY_SESSION_COOKIE_NAMES = ["jair_session", "session"] as const;
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const SESSION_TOKEN_BYTES = 32;
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_PARAMS = "N=16384,r=8,p=1";
const LEGACY_SHA256_RE = /^[a-f0-9]{64}$/i;

export type AuthenticatedUser = {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  emailVerifiedAt?: Date | null;
  subscription?: { status?: string | null; providerCustomerId?: string | null } | null;
};

export type SessionUser = AuthenticatedUser & { sessionId: string };

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function createToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function hashSessionToken(token: string) {
  return sha256(token);
}

export function hashToken(token: string) {
  return sha256(token);
}

function timingSafeEqualString(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("base64url");
  const key = (await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEY_LENGTH, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  })).toString("base64url");
  return `scrypt$${SCRYPT_PARAMS}$${salt}$${key}`;
}

export function isLegacySha256Hash(hash: string | null | undefined) {
  return Boolean(hash && LEGACY_SHA256_RE.test(hash));
}

export async function verifyPassword(password: string, storedHash: string | null | undefined) {
  if (!storedHash) return { valid: false, needsRehash: false };
  if (isLegacySha256Hash(storedHash)) {
    return { valid: timingSafeEqualString(sha256(password), storedHash), needsRehash: true };
  }
  const [scheme, params, salt, expected] = storedHash.split("$");
  if (scheme !== "scrypt" || params !== SCRYPT_PARAMS || !salt || !expected) {
    return { valid: false, needsRehash: false };
  }
  const actual = (await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEY_LENGTH, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  })).toString("base64url");
  return { valid: timingSafeEqualString(actual, expected), needsRehash: false };
}

export async function createVerification(email: string) {
  const token = createToken();
  await db.emailVerificationToken.create({
    data: { email, token: hashToken(token), expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24) },
  });
  return token;
}

export async function ensureUnsubscribeToken(userId: string): Promise<string> {
  const token = createToken();
  await db.user.update({
    where: { id: userId },
    data: { unsubscribeToken: hashToken(token) },
  });
  return token;
}

export async function createSession(userId: string) {
  const token = createToken(SESSION_TOKEN_BYTES);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  const session = await db.session.create({
    data: { userId, tokenHash: hashSessionToken(token), expiresAt },
  });
  return { token, sessionId: session.id, expiresAt };
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
  for (const name of LEGACY_SESSION_COOKIE_NAMES) response.cookies.delete(name);
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.delete(SESSION_COOKIE_NAME);
  for (const name of LEGACY_SESSION_COOKIE_NAMES) response.cookies.delete(name);
}

export async function startSession(response: NextResponse, userId: string) {
  const { token } = await createSession(userId);
  setSessionCookie(response, token);
}

async function resolveSessionToken(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: { include: { subscription: true } } },
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date()) return null;
  await db.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
  return {
    sessionId: session.id,
    id: session.user.id,
    email: session.user.email,
    displayName: session.user.displayName,
    role: session.user.role,
    emailVerifiedAt: session.user.emailVerifiedAt,
    subscription: session.user.subscription,
  };
}

export async function getCurrentUserFromRequest(request: NextRequest | Request) {
  const token = request instanceof NextRequest ? request.cookies.get(SESSION_COOKIE_NAME)?.value : undefined;
  return resolveSessionToken(token);
}

export async function getCurrentUserFromCookies() {
  const cookieStore = await cookies();
  return resolveSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export async function revokeCurrentSession(request: NextRequest | Request) {
  const token = request instanceof NextRequest ? request.cookies.get(SESSION_COOKIE_NAME)?.value : undefined;
  if (token) await db.session.updateMany({ where: { tokenHash: hashSessionToken(token) }, data: { revokedAt: new Date() } });
}

export function getSessionFromCookie(_cookieValue: string | undefined): { userId: string; email: string; role: string; iat?: number } | null {
  return null;
}
