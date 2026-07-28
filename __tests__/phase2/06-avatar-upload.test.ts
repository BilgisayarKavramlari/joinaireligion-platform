/**
 * Phase 2 — Test 06: Profile image upload validation
 *
 * Tests POST /api/upload/avatar (src/app/api/upload/avatar/route.ts).
 *
 * Phase 2.4 requirement: accept jpg/png/webp only, max 2 MB, store avatarPath
 * in UserProfile. Filesystem writes are mocked so the test suite runs without
 * a real disk.
 *
 * Covered scenarios:
 *   1. Unauthenticated request → 401
 *   2. No file in FormData → 400
 *   3. Rejected MIME type (gif) → 400
 *   4. Rejected MIME type (pdf) → 400
 *   5. File exceeds 2 MB size limit → 400
 *   6. Valid JPEG → 200, avatarPath stored in DB
 *   7. Valid PNG → 200, avatarPath stored in DB
 *   8. Valid WebP → 200, avatarPath stored in DB
 *   9. avatarPath is a URL-safe, userId-scoped path
 *  10. DB upsert called with correct userId
 */

import { jsonBody } from "../helpers/mockDb";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetSession = jest.fn();
const mockCookiesGet = jest.fn();

jest.mock("next/headers", () => ({
  cookies: jest.fn(() => ({
    get: mockCookiesGet,
  })),
}));

jest.mock("@/lib/auth", () => ({
  ...jest.requireActual("@/lib/auth"),
  getSessionFromCookie: mockGetSession,
  getCurrentUserFromCookies: async () => {
    const session = mockGetSession();
    return session ? { id: session.userId, email: session.email, role: session.role, displayName: null } : null;
  },
}));

jest.mock("@/lib/db", () => ({
  db: {
    userProfile: {
      upsert: jest.fn(),
    },
  },
}));

// Mock the fs/promises module to avoid actual disk writes
jest.mock("fs/promises", () => ({
  writeFile: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("sharp", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    metadata: jest.fn().mockResolvedValue({ width: 512, height: 512 }),
    rotate: jest.fn().mockReturnThis(),
    toFormat: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from("sanitized-image")),
  })),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { db } from "@/lib/db";
import { POST } from "@/app/api/upload/avatar/route";

const mockDb = db as jest.Mocked<typeof db>;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const fakeSession = { userId: "u_avatar_001", email: "img@sacred.test", role: "USER", iat: Date.now() };
const ONE_MB = 1024 * 1024;
const TWO_MB_PLUS_ONE = 2 * ONE_MB + 1;

function makeFile(name: string, type: string, sizeBytes: number): File {
  const content = new Uint8Array(sizeBytes);
  if (type === "image/jpeg" && sizeBytes >= 4) {
    content.set([0xff, 0xd8], 0);
    content.set([0xff, 0xd9], sizeBytes - 2);
  } else if (type === "image/png" && sizeBytes >= 8) {
    content.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  } else if (type === "image/webp" && sizeBytes >= 12) {
    content.set(Buffer.from("RIFF"), 0);
    content.set(Buffer.from("WEBP"), 8);
  }
  return new File([content], name, { type });
}

function buildAvatarRequest(file: File | null): Request {
  mockCookiesGet.mockReturnValue({ value: "session_val" });
  mockGetSession.mockReturnValue(fakeSession);

  const form = new FormData();
  if (file) form.append("avatar", file);
  return new Request("http://localhost/api/upload/avatar", { method: "POST", body: form });
}

function unauthenticatedAvatarRequest(file: File): Request {
  mockCookiesGet.mockReturnValue(undefined);
  mockGetSession.mockReturnValue(null);
  const form = new FormData();
  form.append("avatar", file);
  return new Request("http://localhost/api/upload/avatar", { method: "POST", body: form });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/upload/avatar", () => {
  beforeEach(() => {
    (mockDb.userProfile.upsert as jest.Mock).mockResolvedValue({});
  });

  // ─── Auth guard ───────────────────────────────────────────────────────────────

  it("401 when no valid session", async () => {
    const file = makeFile("photo.jpg", "image/jpeg", ONE_MB);
    const req = unauthenticatedAvatarRequest(file);
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  // ─── Missing file ─────────────────────────────────────────────────────────────

  it("400 when no file is provided in FormData", async () => {
    const req = buildAvatarRequest(null);
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await jsonBody(res);
    expect(body.error).toMatch(/no file/i);
  });

  // ─── MIME-type validation ─────────────────────────────────────────────────────

  it("400 when file type is GIF (not allowed)", async () => {
    const req = buildAvatarRequest(makeFile("anim.gif", "image/gif", ONE_MB));
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await jsonBody(res);
    expect(body.error).toMatch(/jpg|png|webp/i);
  });

  it("400 when file type is PDF (not allowed)", async () => {
    const req = buildAvatarRequest(makeFile("doc.pdf", "application/pdf", ONE_MB));
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await jsonBody(res);
    expect(body.error).toMatch(/jpg|png|webp/i);
  });

  it("400 when file type is SVG (not allowed)", async () => {
    const req = buildAvatarRequest(makeFile("icon.svg", "image/svg+xml", 5000));
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  // ─── Size validation ──────────────────────────────────────────────────────────

  it("400 when file exceeds 2 MB", async () => {
    const req = buildAvatarRequest(makeFile("big.jpg", "image/jpeg", TWO_MB_PLUS_ONE));
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await jsonBody(res);
    expect(body.error).toMatch(/2mb|too large/i);
  });

  it("200 when file is exactly at the 2 MB limit (JPEG)", async () => {
    const req = buildAvatarRequest(makeFile("limit.jpg", "image/jpeg", 2 * ONE_MB));
    const res = await POST(req as any);
    expect(res.status).toBe(200);
  });

  // ─── Accepted MIME types ──────────────────────────────────────────────────────

  it("200 + ok:true for a valid JPEG", async () => {
    const req = buildAvatarRequest(makeFile("photo.jpg", "image/jpeg", ONE_MB));
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await jsonBody(res);
    expect(body.ok).toBe(true);
  });

  it("200 + ok:true for a valid PNG", async () => {
    const req = buildAvatarRequest(makeFile("photo.png", "image/png", ONE_MB));
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await jsonBody(res);
    expect(body.ok).toBe(true);
  });

  it("200 + ok:true for a valid WebP", async () => {
    const req = buildAvatarRequest(makeFile("photo.webp", "image/webp", ONE_MB));
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await jsonBody(res);
    expect(body.ok).toBe(true);
  });

  // ─── DB and path ──────────────────────────────────────────────────────────────

  it("returned avatarPath is scoped to the user's ID", async () => {
    const req = buildAvatarRequest(makeFile("photo.jpg", "image/jpeg", ONE_MB));
    const res = await POST(req as any);
    const body = await jsonBody(res);
    expect(String(body.avatarPath)).toContain(fakeSession.userId);
  });

  it("avatarPath is a web-safe URL (starts with /uploads/)", async () => {
    const req = buildAvatarRequest(makeFile("photo.png", "image/png", ONE_MB));
    const res = await POST(req as any);
    const body = await jsonBody(res);
    expect(String(body.avatarPath)).toMatch(/^\/uploads\//);
  });

  it("upserts UserProfile.avatarPath with the correct userId", async () => {
    const req = buildAvatarRequest(makeFile("photo.webp", "image/webp", 500_000));
    await POST(req as any);
    const upsert = (mockDb.userProfile.upsert as jest.Mock).mock.calls[0][0];
    expect(upsert.where.userId).toBe(fakeSession.userId);
    expect(upsert.create.avatarPath).toMatch(/^\/uploads\//);
    expect(upsert.update.avatarPath).toMatch(/^\/uploads\//);
  });
});
