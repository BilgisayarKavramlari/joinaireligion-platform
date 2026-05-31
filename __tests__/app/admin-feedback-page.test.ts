const mockRequireAdminSession = jest.fn();
const mockRedirect = jest.fn((destination: string) => {
  throw new Error(`REDIRECT:${destination}`);
});

jest.mock("@/lib/admin", () => ({
  requireAdminSession: mockRequireAdminSession,
}));

jest.mock("@/lib/db", () => ({
  db: {
    feedbackItem: {
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
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
  });

  it("redirects anonymous visitors to /admin/login instead of throwing a 500", async () => {
    mockRequireAdminSession.mockRejectedValue(new Error("UNAUTHORIZED"));

    await expect(
      AdminFeedbackPage({ searchParams: Promise.resolve({}) })
    ).rejects.toThrow("REDIRECT:/admin/login");

    expect(mockRedirect).toHaveBeenCalledWith("/admin/login");
  });
});
