const mockGetCurrentUser = jest.fn();
const mockCreate = jest.fn();

jest.mock("@/lib/access", () => ({ getCurrentUser: () => mockGetCurrentUser() }));
jest.mock("@/lib/env", () => ({
  env: { PRIVATE_DATA_ENCRYPTION_KEY: "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc=" },
}));
jest.mock("@/lib/db", () => ({ db: { personalPlan: { create: (...args: unknown[]) => mockCreate(...args) } } }));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/account/plans/route";

describe("personal plans API", () => {
  beforeEach(() => jest.clearAllMocks());

  it("stores an owned plan with encrypted descriptive fields", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user_self" });
    mockCreate.mockResolvedValue({ id: "plan_1" });
    const response = await POST(new NextRequest("https://example.com/api/account/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Read a private book", details: "Chapter notes", activityType: "READING", status: "PLANNED", scheduledFor: "2026-08-01T15:00:00.000Z", durationMins: 30 }),
    }));

    expect(response.status).toBe(201);
    const data = mockCreate.mock.calls[0][0].data;
    expect(data.userId).toBe("user_self");
    expect(data.encryptedPayload).not.toContain("Read a private book");
    expect(data.encryptedPayload).not.toContain("Chapter notes");
    expect(data.activityType).toBe("READING");
  });

  it("rejects unsupported activity categories", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user_self" });
    const response = await POST(new NextRequest("https://example.com/api/account/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Unsafe category", activityType: "HEALTH_DIAGNOSIS", scheduledFor: "2026-08-01T15:00:00.000Z" }),
    }));
    expect(response.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
