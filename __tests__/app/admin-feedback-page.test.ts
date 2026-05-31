const mockRequireAdminSession = jest.fn();
const mockRedirect = jest.fn((destination: string) => {
  throw new Error(`REDIRECT:${destination}`);
});
const mockFindMany = jest.fn();
const mockCount = jest.fn();
const mockGroupBy = jest.fn();

jest.mock("@/lib/admin", () => ({
  requireAdminSession: mockRequireAdminSession,
}));

jest.mock("@/lib/db", () => ({
  db: {
    feedbackItem: {
      findMany: mockFindMany,
      count: mockCount,
      groupBy: mockGroupBy,
    },
  },
}));

jest.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

import AdminFeedbackPage from "@/app/admin/feedback/page";

describe("AdminFeedbackPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  it("redirects anonymous visitors to /admin/login instead of throwing a 500", async () => {
    mockRequireAdminSession.mockRejectedValue(new Error("UNAUTHORIZED"));

    await expect(
      AdminFeedbackPage({ searchParams: Promise.resolve({}) })
    ).rejects.toThrow("REDIRECT:/admin/login");

    expect(mockRedirect).toHaveBeenCalledWith("/admin/login");
  });

  it("falls back to a legacy-safe feedback query when newer metadata columns are unavailable", async () => {
    mockRequireAdminSession.mockResolvedValue("admin@example.com");
    mockFindMany
      .mockRejectedValueOnce(new Error("The column `FeedbackItem.authState` does not exist"))
      .mockResolvedValueOnce([
        {
          id: "fb_legacy_1",
          userId: null,
          category: "BUG",
          status: "OPEN",
          pageContext: "/lessons",
          message: "Legacy feedback row",
          adminNotes: null,
          createdAt: new Date("2026-05-31T02:00:00.000Z"),
          user: null,
        },
      ]);
    mockCount.mockResolvedValue(1);
    mockGroupBy.mockResolvedValue([{ status: "OPEN", _count: { _all: 1 } }]);

    const page = await AdminFeedbackPage({ searchParams: Promise.resolve({}) });

    expect(page).toBeTruthy();
    expect(mockFindMany).toHaveBeenCalledTimes(2);
    expect(mockFindMany.mock.calls[0][0].select.authState).toBe(true);
    expect(mockFindMany.mock.calls[0][0].select.pageUrl).toBe(true);
    expect(mockFindMany.mock.calls[1][0].select.authState).toBeUndefined();
    expect(mockFindMany.mock.calls[1][0].select.pageContext).toBe(true);
  });
});
