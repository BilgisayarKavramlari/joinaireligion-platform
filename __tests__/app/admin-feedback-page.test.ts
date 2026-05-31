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

function extractText(node: unknown): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join(" ");
  if (typeof node === "object" && "props" in node) {
    const props = (node as { props?: { children?: unknown } }).props;
    return extractText(props?.children);
  }
  return "";
}

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
    expect(mockFindMany.mock.calls[1][0].select.triageCategory).toBeUndefined();
    expect(mockFindMany.mock.calls[1][0].select.supportReplies).toBeUndefined();
  });

  it("requests triage and reply fields in the full query and renders persisted support metadata when present", async () => {
    mockRequireAdminSession.mockResolvedValue("admin@example.com");
    mockFindMany.mockResolvedValue([
      {
        id: "fb_triaged_1",
        userId: "user_1",
        category: "BUG",
        status: "OPEN",
        authState: "AUTHENTICATED",
        submitterEmail: "user@example.com",
        submitterLocale: "en",
        pageUrl: "/prompt-guide",
        userAgent: "jest-agent",
        pageContext: "/prompt-guide",
        message: "Billing page fails to load after payment.",
        adminNotes: null,
        triageCategory: "BILLING",
        triageSeverity: "HIGH",
        recommendedAction: "ESCALATE_TO_ADMIN",
        triageStatus: "TRIAGED",
        triagedAt: new Date("2026-05-31T05:00:00.000Z"),
        supportReplies: [
          {
            id: "reply_1",
            authorType: "SUPPORT_AGENT",
            visibility: "ADMIN_ONLY",
            status: "DRAFT",
            body: "We can help investigate your billing issue before sending anything to the user.",
            rationaleSummary: "Hold for admin review until billing risk is confirmed.",
            agentRunId: "run_support_1",
            createdAt: new Date("2026-05-31T05:02:00.000Z"),
          },
        ],
        createdAt: new Date("2026-05-31T04:59:00.000Z"),
        user: { email: "user@example.com", displayName: "Seeker", role: "USER" },
      },
    ]);
    mockCount.mockResolvedValue(1);
    mockGroupBy.mockResolvedValue([{ status: "OPEN", _count: { _all: 1 } }]);

    const page = await AdminFeedbackPage({ searchParams: Promise.resolve({}) });
    const text = extractText(page).replace(/\s+/g, " ").trim();

    expect(mockFindMany).toHaveBeenCalledTimes(1);
    expect(mockFindMany.mock.calls[0][0].select.triageCategory).toBe(true);
    expect(mockFindMany.mock.calls[0][0].select.triageSeverity).toBe(true);
    expect(mockFindMany.mock.calls[0][0].select.recommendedAction).toBe(true);
    expect(mockFindMany.mock.calls[0][0].select.triageStatus).toBe(true);
    expect(mockFindMany.mock.calls[0][0].select.triagedAt).toBe(true);
    expect(mockFindMany.mock.calls[0][0].select.supportReplies.select.authorType).toBe(true);
    expect(mockFindMany.mock.calls[0][0].select.supportReplies.select.visibility).toBe(true);
    expect(mockFindMany.mock.calls[0][0].select.supportReplies.select.status).toBe(true);
    expect(mockFindMany.mock.calls[0][0].select.supportReplies.select.body).toBe(true);
    expect(text).toContain("triage: billing");
    expect(text).toContain("severity: high");
    expect(text).toContain("action: escalate to admin");
    expect(text).toContain("triage status: triaged");
    expect(text).toContain("Triaged at: 2026-05-31 05:00 UTC");
    expect(text).toContain("Support Replies");
    expect(text).toContain("author: support agent");
    expect(text).toContain("visibility: admin only");
    expect(text).toContain("status: draft");
    expect(text).toContain("We can help investigate your billing issue before sending anything to the user.");
    expect(text).toContain("Rationale: Hold for admin review until billing risk is confirmed.");
    expect(text).toContain("Agent run: run_support_1");
    expect(text).toContain("Publish to user");
  });

  it("does not render a support replies section when no replies exist", async () => {
    mockRequireAdminSession.mockResolvedValue("admin@example.com");
    mockFindMany.mockResolvedValue([
      {
        id: "fb_open_1",
        userId: null,
        category: "CONTENT",
        status: "OPEN",
        authState: "ANONYMOUS",
        submitterEmail: null,
        submitterLocale: "en",
        pageUrl: "/prompt-guide",
        userAgent: "jest-agent",
        pageContext: "/prompt-guide",
        message: "A paragraph typo still appears on the lesson page.",
        adminNotes: null,
        triageCategory: null,
        triageSeverity: null,
        recommendedAction: null,
        triageStatus: null,
        triagedAt: null,
        supportReplies: [],
        createdAt: new Date("2026-05-31T06:00:00.000Z"),
        user: null,
      },
    ]);
    mockCount.mockResolvedValue(1);
    mockGroupBy.mockResolvedValue([{ status: "OPEN", _count: { _all: 1 } }]);

    const page = await AdminFeedbackPage({ searchParams: Promise.resolve({}) });
    const text = extractText(page).replace(/\s+/g, " ").trim();

    expect(text).not.toContain("Support Replies");
  });
});
