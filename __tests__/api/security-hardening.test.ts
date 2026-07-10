import { hashPassword, verifyPassword, getSessionFromCookie, SESSION_COOKIE_NAME } from "@/lib/auth";
import { escapeHtml, safeInternalPath } from "@/lib/security";
import { checkRateLimit, resetRateLimitForTests } from "@/lib/rate-limit";

describe("security hardening helpers", () => {
  beforeEach(() => resetRateLimitForTests());

  it("does not parse legacy unsigned base64 JSON sessions", () => {
    const legacy = Buffer.from(JSON.stringify({ userId: "u1", email: "a@test", role: "ADMIN" })).toString("base64");
    expect(getSessionFromCookie(legacy)).toBeNull();
    expect(SESSION_COOKIE_NAME).toBe("__Host-jair_session");
  });

  it("creates non-deterministic scrypt password hashes and verifies them", async () => {
    const a = await hashPassword("correct horse battery staple");
    const b = await hashPassword("correct horse battery staple");
    expect(a).toMatch(/^scrypt\$/);
    expect(b).toMatch(/^scrypt\$/);
    expect(a).not.toBe(b);
    await expect(verifyPassword("correct horse battery staple", a)).resolves.toMatchObject({ valid: true });
    await expect(verifyPassword("wrong password", a)).resolves.toMatchObject({ valid: false });
  });

  it("supports legacy SHA-256 verification with rehash signal", async () => {
    const legacy = "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8";
    await expect(verifyPassword("password", legacy)).resolves.toEqual({ valid: true, needsRehash: true });
  });

  it("escapes HTML and rejects external redirect paths", () => {
    expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe("&lt;img src=x onerror=alert(1)&gt;");
    expect(safeInternalPath("/admin/feedback?page=1", "/admin/feedback")).toBe("/admin/feedback?page=1");
    expect(safeInternalPath("//evil.com", "/admin/feedback")).toBe("/admin/feedback");
    expect(safeInternalPath("https://evil.com", "/admin/feedback")).toBe("/admin/feedback");
  });

  it("throttles after the configured limit", () => {
    expect(checkRateLimit("k", { limit: 1, windowMs: 1000 }).allowed).toBe(true);
    expect(checkRateLimit("k", { limit: 1, windowMs: 1000 }).allowed).toBe(false);
  });
});
