const mockCookiesGet = jest.fn();
const mockGetSession = jest.fn();
const mockFeedbackFindMany = jest.fn();

jest.mock("next/headers", () => ({
  cookies: jest.fn(() => ({ get: mockCookiesGet })),
}));

jest.mock("@/lib/auth", () => ({
  getSessionFromCookie: (...args: unknown[]) => mockGetSession(...args),
  getCurrentUserFromCookies: async () => {
    const session = mockGetSession();
    return session ? { id: session.userId, email: session.email, role: session.role, displayName: null } : null;
  },
}));

jest.mock("@/lib/db", () => ({
  db: {
    feedbackItem: {
      findMany: (...args: unknown[]) => mockFeedbackFindMany(...args),
    },
  },
}));

import { GET } from "@/app/api/account/support/route";

describe("GET /api/account/support", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when no authenticated session exists", async () => {
    mockCookiesGet.mockReturnValue(undefined);
    mockGetSession.mockReturnValue(null);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns the current user's feedback with only USER_VISIBLE approved or sent replies", async () => {
    mockCookiesGet.mockReturnValue({ value: "cookie" });
    mockGetSession.mockReturnValue({ userId: "user_123", email: "seeker@example.com", role: "USER" });
    mockFeedbackFindMany.mockResolvedValue([
      {
        id: "fb_1",
        category: "BUG",
        status: "OPEN",
        message: "The support timeline is confusing.",
        createdAt: new Date("2026-05-31T18:10:00.000Z"),
        supportReplies: [
          {
            id: "reply_approved",
            status: "APPROVED",
            body: "Thanks for reporting this. We have reviewed the issue.",
            createdAt: new Date("2026-05-31T18:20:00.000Z"),
          },
          {
            id: "reply_sent",
            status: "SENT",
            body: "A user-visible follow-up has been sent.",
            createdAt: new Date("2026-05-31T18:25:00.000Z"),
          },
        ],
      },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockFeedbackFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user_123" },
        orderBy: { createdAt: "desc" },
        select: expect.objectContaining({
          supportReplies: expect.objectContaining({
            where: {
              visibility: "USER_VISIBLE",
              status: { in: ["APPROVED", "SENT"] },
            },
          }),
        }),
      })
    );
    expect(body.tickets).toHaveLength(1);
    expect(body.tickets[0].supportReplies).toHaveLength(2);
    expect(body.tickets[0].supportReplies[0].body).toContain("Thanks for reporting this");
  });

  it("never queries or returns another user's feedback", async () => {
    mockCookiesGet.mockReturnValue({ value: "cookie" });
    mockGetSession.mockReturnValue({ userId: "user_self", email: "self@example.com", role: "USER" });
    mockFeedbackFindMany.mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockFeedbackFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user_self" },
      })
    );
    expect(body).toEqual({ tickets: [] });
  });

  it("filters out ADMIN_ONLY and DRAFT replies at the query boundary", async () => {
    mockCookiesGet.mockReturnValue({ value: "cookie" });
    mockGetSession.mockReturnValue({ userId: "user_123", email: "seeker@example.com", role: "USER" });
    mockFeedbackFindMany.mockResolvedValue([
      {
        id: "fb_2",
        category: "CONTENT",
        status: "IN_REVIEW",
        message: "I found a typo in the lesson text.",
        createdAt: new Date("2026-05-31T18:11:00.000Z"),
        supportReplies: [],
      },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockFeedbackFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          supportReplies: expect.objectContaining({
            where: {
              visibility: "USER_VISIBLE",
              status: { in: ["APPROVED", "SENT"] },
            },
          }),
        }),
      })
    );
    expect(body.tickets[0].supportReplies).toEqual([]);
  });
});
