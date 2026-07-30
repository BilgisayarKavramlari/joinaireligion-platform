const mockGetCurrentUser = jest.fn();
const mockDeleteMany = jest.fn();
const mockFindMany = jest.fn();
const mockCreate = jest.fn();
const mockFindFirst = jest.fn();
const mockUpdate = jest.fn();

jest.mock("@/lib/access", () => ({ getCurrentUser: () => mockGetCurrentUser() }));
jest.mock("@/lib/env", () => ({
  env: { PRIVATE_DATA_ENCRYPTION_KEY: "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc=" },
}));
jest.mock("@/lib/db", () => ({
  db: {
    privateNote: {
      deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/account/notes/route";
import { PATCH } from "@/app/api/account/notes/[id]/route";
import { encryptPrivatePayload } from "@/lib/private-data";

describe("private notes API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeleteMany.mockResolvedValue({ count: 0 });
  });

  it("requires authentication", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const response = await GET(new NextRequest("https://example.com/api/account/notes"));
    expect(response.status).toBe(401);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("queries only the current user's encrypted notes and decrypts for that user", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user_self" });
    mockFindMany.mockResolvedValue([{
      id: "note_1",
      encryptedPayload: encryptPrivatePayload({ title: "My note", body: "Private body", tags: ["daily"] }),
      aiAccessEnabled: false,
      expiresAt: null,
      createdAt: new Date("2026-07-30T01:00:00.000Z"),
      updatedAt: new Date("2026-07-30T02:00:00.000Z"),
    }]);

    const response = await GET(new NextRequest("https://example.com/api/account/notes"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user_self" } }));
    expect(body.notes[0]).toEqual(expect.objectContaining({ title: "My note", body: "Private body", aiAccessEnabled: false }));
  });

  it("stores note content only inside the encrypted payload", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user_self" });
    mockCreate.mockResolvedValue({ id: "note_new" });
    const response = await POST(new NextRequest("https://example.com/api/account/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Secret title", body: "Secret body", tags: ["private"], aiAccessEnabled: false }),
    }));

    expect(response.status).toBe(201);
    const call = mockCreate.mock.calls[0][0];
    expect(call.data.userId).toBe("user_self");
    expect(call.data.encryptedPayload).not.toContain("Secret title");
    expect(call.data.encryptedPayload).not.toContain("Secret body");
    expect(call.data.aiAccessEnabled).toBe(false);
  });

  it("never updates a note unless it belongs to the current user", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user_self" });
    mockFindFirst.mockResolvedValue(null);
    const response = await PATCH(new NextRequest("https://example.com/api/account/notes/note_other", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Changed", body: "Changed body", tags: [] }),
    }), { params: Promise.resolve({ id: "note_other" }) });

    expect(response.status).toBe(404);
    expect(mockFindFirst).toHaveBeenCalledWith({ where: { id: "note_other", userId: "user_self" }, select: { id: true } });
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
