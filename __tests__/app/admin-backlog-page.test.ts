const mockRequireAdminSession = jest.fn();
const mockRedirect = jest.fn((destination: string) => {
  throw new Error(`REDIRECT:${destination}`);
});
const mockBacklogFindMany = jest.fn();
const mockBacklogCount = jest.fn();
const mockBacklogGroupBy = jest.fn();

jest.mock("@/lib/admin", () => ({
  requireAdminSession: mockRequireAdminSession,
}));

jest.mock("@/lib/db", () => ({
  db: {
    backlogItem: {
      findMany: mockBacklogFindMany,
      count: mockBacklogCount,
      groupBy: mockBacklogGroupBy,
    },
  },
}));

jest.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

import AdminBacklogPage from "@/app/admin/backlog/page";

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

describe("AdminBacklogPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  it("redirects anonymous visitors to /admin/login", async () => {
    mockRequireAdminSession.mockRejectedValue(new Error("UNAUTHORIZED"));

    await expect(AdminBacklogPage()).rejects.toThrow("REDIRECT:/admin/login");
    expect(mockRedirect).toHaveBeenCalledWith("/admin/login");
  });

  it("falls back to a safe empty backlog when foundation tables are unavailable", async () => {
    mockRequireAdminSession.mockResolvedValue("admin@example.com");
    mockBacklogFindMany.mockRejectedValue(new Error("relation \"BacklogItem\" does not exist"));

    const page = await AdminBacklogPage();
    const text = extractText(page).replace(/\s+/g, " ").trim();

    expect(text).toContain("Compatibility mode active");
    expect(text).toContain("No backlog items yet.");
    expect(mockBacklogFindMany).toHaveBeenCalledTimes(1);
  });

  it("renders backlog items with linked idea and release metadata", async () => {
    mockRequireAdminSession.mockResolvedValue("admin@example.com");
    mockBacklogFindMany.mockResolvedValue([
      {
        id: "backlog_1",
        title: "Stabilize support reply drafts",
        summary: "Prepare safe review and release flow before enabling user-visible replies.",
        status: "READY_FOR_IMPLEMENTATION",
        priority: "HIGH",
        userImpact: "High",
        revenueImpact: "Medium",
        riskLevel: "Moderate",
        ownerAgent: "CTO",
        createdAt: new Date("2026-05-31T15:00:00.000Z"),
        updatedAt: new Date("2026-05-31T15:30:00.000Z"),
        idea: { id: "idea_1", title: "Support reply readiness" },
        targetRelease: { id: "rel_1", version: "v0.2.0", title: "Reply foundation" },
        _count: { engineeringTasks: 2 },
      },
    ]);
    mockBacklogCount.mockResolvedValue(1);
    mockBacklogGroupBy.mockResolvedValue([{ status: "READY_FOR_IMPLEMENTATION", _count: { _all: 1 } }]);

    const page = await AdminBacklogPage();
    const text = extractText(page).replace(/\s+/g, " ").trim();

    expect(text).toContain("Backlog Foundation");
    expect(text).toContain("Stabilize support reply drafts");
    expect(text).toContain("Prepare safe review and release flow before enabling user-visible replies.");
    expect(text).toContain("priority: high");
    expect(text).toContain("Tasks: 2");
    expect(text).toContain("Idea: Support reply readiness");
    expect(text).toContain("Release: v0.2.0");
    expect(text).toContain("Owner agent: CTO");
    expect(text).toContain("ready for implementation (1)");
  });
});
