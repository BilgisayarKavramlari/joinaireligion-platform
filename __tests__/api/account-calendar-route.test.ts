const mockGetCurrentUser = jest.fn();
const mockPlans = jest.fn();
const mockPracticeLogs = jest.fn();
const mockLessons = jest.fn();
const mockMessages = jest.fn();

jest.mock("@/lib/access", () => ({ getCurrentUser: () => mockGetCurrentUser() }));
jest.mock("@/lib/private-data", () => ({ decryptPrivatePayload: () => ({ title: "Private plan", details: "Private details" }) }));
jest.mock("@/lib/db", () => ({
  db: {
    personalPlan: { findMany: (...args: unknown[]) => mockPlans(...args) },
    userPracticeLog: { findMany: (...args: unknown[]) => mockPracticeLogs(...args) },
    userLesson: { findMany: (...args: unknown[]) => mockLessons(...args) },
    practiceMessage: { findMany: (...args: unknown[]) => mockMessages(...args) },
  },
}));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/account/calendar/route";

describe("account calendar API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPlans.mockResolvedValue([]);
    mockPracticeLogs.mockResolvedValue([]);
    mockLessons.mockResolvedValue([]);
    mockMessages.mockResolvedValue([]);
  });

  it("requires authentication", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const response = await GET(new NextRequest("https://example.com/api/account/calendar"));
    expect(response.status).toBe(401);
    expect(mockPlans).not.toHaveBeenCalled();
  });

  it("scopes every calendar source to the current user", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user_self" });
    const response = await GET(new NextRequest("https://example.com/api/account/calendar?from=2026-07-01T00:00:00.000Z&to=2026-08-01T00:00:00.000Z"));
    expect(response.status).toBe(200);

    for (const query of [mockPlans, mockPracticeLogs, mockLessons, mockMessages]) {
      expect(query.mock.calls[0][0].where.userId).toBe("user_self");
    }
  });

  it("rejects calendar ranges larger than one year", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user_self" });
    const response = await GET(new NextRequest("https://example.com/api/account/calendar?from=2025-01-01T00:00:00.000Z&to=2026-08-01T00:00:00.000Z"));
    expect(response.status).toBe(400);
    expect(mockPlans).not.toHaveBeenCalled();
  });
});
