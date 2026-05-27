/**
 * Phase 2 — Test 01: Auth utility functions
 *
 * Tests pure-function behaviour of src/lib/auth.ts:
 *   - hashPassword: deterministic SHA-256 digest
 *   - createToken: 48-hex-char random token
 *   - setSessionCookie: cookie name, httpOnly flag, base64-encoded payload
 *   - getSessionFromCookie: round-trip decoding, null on bad input
 *
 * No database or HTTP stack is required.
 */

// auth.ts imports db.ts which imports @prisma/client (which isn't generated
// in the CI/test environment). Mock it so pure-function tests can load.
jest.mock("@/lib/db", () => ({ db: {} }));

import { hashPassword, createToken, setSessionCookie, getSessionFromCookie } from "@/lib/auth";
import { NextResponse } from "next/server";

// ─── hashPassword ─────────────────────────────────────────────────────────────

describe("hashPassword", () => {
  it("returns a 64-character hex string (SHA-256)", () => {
    const hash = hashPassword("secret123");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic — same input always yields same digest", () => {
    expect(hashPassword("password")).toBe(hashPassword("password"));
  });

  it("different inputs produce different hashes", () => {
    expect(hashPassword("abc")).not.toBe(hashPassword("ABC"));
  });
});

// ─── createToken ──────────────────────────────────────────────────────────────

describe("createToken", () => {
  it("returns a 48-char hex string", () => {
    const token = createToken();
    expect(token).toHaveLength(48);
    expect(token).toMatch(/^[0-9a-f]{48}$/);
  });

  it("every call returns a unique token", () => {
    const tokens = Array.from({ length: 20 }, () => createToken());
    const unique = new Set(tokens);
    expect(unique.size).toBe(20);
  });
});

// ─── session cookie round-trip ────────────────────────────────────────────────

describe("setSessionCookie / getSessionFromCookie", () => {
  const payload = { userId: "u_123", email: "alice@example.com", role: "USER" };

  function extractCookieValue(response: NextResponse): string | null {
    // NextResponse stores set-cookie in headers
    const raw = response.headers.get("set-cookie") || "";
    const match = raw.match(/jair_session=([^;]+)/);
    return match ? match[1] : null;
  }

  it("sets a cookie named jair_session", () => {
    const res = NextResponse.json({ ok: true });
    setSessionCookie(res, payload);
    expect(res.headers.get("set-cookie")).toContain("jair_session=");
  });

  it("includes HttpOnly in the cookie attributes", () => {
    const res = NextResponse.json({ ok: true });
    setSessionCookie(res, payload);
    expect(res.headers.get("set-cookie")?.toLowerCase()).toContain("httponly");
  });

  it("round-trips: decoded cookie matches original payload fields", () => {
    const res = NextResponse.json({ ok: true });
    setSessionCookie(res, payload);
    const cookieVal = extractCookieValue(res);
    expect(cookieVal).not.toBeNull();

    const decoded = getSessionFromCookie(cookieVal!);
    expect(decoded).not.toBeNull();
    expect(decoded!.userId).toBe(payload.userId);
    expect(decoded!.email).toBe(payload.email);
    expect(decoded!.role).toBe(payload.role);
  });

  it("decoded session includes iat timestamp (number)", () => {
    const before = Date.now();
    const res = NextResponse.json({ ok: true });
    setSessionCookie(res, payload);
    const cookieVal = extractCookieValue(res);
    const decoded = getSessionFromCookie(cookieVal!);
    expect(decoded!.iat).toBeGreaterThanOrEqual(before);
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
