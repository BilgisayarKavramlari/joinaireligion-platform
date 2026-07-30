const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDeleteMany = jest.fn();

jest.mock("@/lib/env", () => ({ env: { CRON_SECRET: "cron-secret" } }));
jest.mock("@/lib/db", () => ({
  db: {
    agentRun: { create: (...args: unknown[]) => mockCreate(...args), update: (...args: unknown[]) => mockUpdate(...args) },
    privateNote: { deleteMany: (...args: unknown[]) => mockDeleteMany(...args) },
  },
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/cron/private-note-retention/route";

describe("private note retention cron", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockResolvedValue({ id: "run_1" });
    mockUpdate.mockResolvedValue({ id: "run_1" });
    mockDeleteMany.mockResolvedValue({ count: 3 });
  });

  it("requires the cron credential", async () => {
    const response = await POST(new NextRequest("https://example.com/api/cron/private-note-retention", { method: "POST" }));
    expect(response.status).toBe(401);
    expect(mockDeleteMany).not.toHaveBeenCalled();
  });

  it("deletes only expired notes without reading their encrypted content", async () => {
    const response = await POST(new NextRequest("https://example.com/api/cron/private-note-retention", {
      method: "POST",
      headers: { Authorization: "Bearer cron-secret" },
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.deletedExpiredNotes).toBe(3);
    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { expiresAt: { not: null, lte: expect.any(Date) } } });
    expect(mockCreate.mock.calls[0][0].data.input.contentAccessed).toBe(false);
  });
});
