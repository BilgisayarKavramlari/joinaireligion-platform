/**
 * Phase 2 — Test 01: Auth utility functions
 *
 * Tests pure-function behaviour of src/lib/auth.ts:
 *   - hashPassword: salted scrypt digest
 *   - createToken: URL-safe random token
 *   - setSessionCookie: hardened opaque session cookie
 *   - getSessionFromCookie: legacy unsigned cookies are rejected
 *
 * No database or HTTP stack is required.
 */

// auth.ts imports db.ts which imports @prisma/client (which isn't generated
// in the CI/test environment). Mock it so pure-function tests can load.
jest.mock("@/lib/db", () => ({ db: {} }));

import {
  SESSION_COOKIE_NAME,
  createToken,
  getSessionFromCookie,
  hashPassword,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { NextResponse } from "next/server";

// ─── hashPassword ─────────────────────────────────────────────────────────────

describe("hashPassword", () => {
  it("returns a salted scrypt hash", async () => {
    const hash = await hashPassword("secret123");
    expect(hash).toMatch(/^scrypt\$N=16384,r=8,p=1\$/);
    await expect(verifyPassword("secret123", hash)).resolves.toEqual({ valid: true, needsRehash: false });
  });

  it("uses a fresh salt for the same input", async () => {
    await expect(hashPassword("password")).resolves.not.toBe(await hashPassword("password"));
  });

  it("rejects a different input", async () => {
    const hash = await hashPassword("abc");
    await expect(verifyPassword("ABC", hash)).resolves.toMatchObject({ valid: false });
  });
});

// ─── createToken ──────────────────────────────────────────────────────────────

describe("createToken", () => {
  it("returns a 43-character base64url token", () => {
    const token = createToken();
    expect(token).toHaveLength(43);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("every call returns a unique token", () => {
    const tokens = Array.from({ length: 20 }, () => createToken());
    const unique = new Set(tokens);
    expect(unique.size).toBe(20);
  });
});

// ─── session cookie round-trip ────────────────────────────────────────────────

describe("setSessionCookie / getSessionFromCookie", () => {
  const token = createToken();

  function extractCookieValue(response: NextResponse): string | null {
    // NextResponse stores set-cookie in headers
    const raw = response.headers.get("set-cookie") || "";
    const match = raw.match(/__Host-jair_session=([^;]+)/);
    return match ? match[1] : null;
  }

  it("sets the hardened session cookie with the opaque token", () => {
    const res = NextResponse.json({ ok: true });
    setSessionCookie(res, token);
    expect(res.headers.get("set-cookie")).toContain(`${SESSION_COOKIE_NAME}=${token}`);
  });

  it("includes HttpOnly in the cookie attributes", () => {
    const res = NextResponse.json({ ok: true });
    setSessionCookie(res, token);
    expect(res.headers.get("set-cookie")?.toLowerCase()).toContain("httponly");
  });

  it("does not decode opaque tokens as client-side session payloads", () => {
    const res = NextResponse.json({ ok: true });
    setSessionCookie(res, token);
    const cookieVal = extractCookieValue(res);
    expect(cookieVal).not.toBeNull();
    expect(getSessionFromCookie(cookieVal!)).toBeNull();
  });

  it("getSessionFromCookie returns null for undefined input", () => {
    expect(getSessionFromCookie(undefined)).toBeNull();
  });

  it("getSessionFromCookie returns null for malformed base64", () => {
    expect(getSessionFromCookie("!!!not-base64!!!")).toBeNull();
  });

  it("getSessionFromCookie returns null for valid base64 but non-JSON content", () => {
    const bad = Buffer.from("this is not json").toString("base64");
    expect(getSessionFromCookie(bad)).toBeNull();
  });
});
