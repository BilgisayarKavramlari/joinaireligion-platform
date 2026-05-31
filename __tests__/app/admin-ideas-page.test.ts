const mockRequireAdminSession = jest.fn();
const mockRedirect = jest.fn((destination: string) => {
  throw new Error(`REDIRECT:${destination}`);
});
const mockIdeaFindMany = jest.fn();
const mockIdeaCount = jest.fn();
const mockIdeaGroupBy = jest.fn();
const mockIdeaCreate = jest.fn();

jest.mock("@/lib/admin", () => ({
  requireAdminSession: mockRequireAdminSession,
}));

jest.mock("@/lib/db", () => ({
  db: {
    ideaRecord: {
      findMany: mockIdeaFindMany,
      count: mockIdeaCount,
      groupBy: mockIdeaGroupBy,
      create: mockIdeaCreate,
    },
  },
}));

jest.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

import AdminIdeasPage from "@/app/admin/ideas/page";

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

describe("AdminIdeasPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  it("redirects anonymous visitors to /admin/login", async () => {
    mockRequireAdminSession.mockRejectedValue(new Error("UNAUTHORIZED"));

    await expect(AdminIdeasPage()).rejects.toThrow("REDIRECT:/admin/login");
    expect(mockRedirect).toHaveBeenCalledWith("/admin/login");
  });

  it("falls back to a safe empty state when unified idea tables are unavailable", async () => {
    mockRequireAdminSession.mockResolvedValue("admin@example.com");
    mockIdeaFindMany.mockRejectedValue(new Error("relation \"IdeaRecord\" does not exist"));

    const page = await AdminIdeasPage();
    const text = extractText(page).replace(/\s+/g, " ").trim();

    expect(text).toContain("Compatibility mode active");
    expect(text).toContain("No idea records yet.");
    expect(mockIdeaFindMany).toHaveBeenCalledTimes(1);
  });

  it("renders admin ideas with counters when records exist", async () => {
    mockRequireAdminSession.mockResolvedValue("admin@example.com");
    mockIdeaFindMany.mockResolvedValue([
      {
        id: "idea_1",
        sourceType: "ADMIN_IDEA",
        title: "Improve lesson completion nudges",
        summary: "Add clearer recovery prompts after failed attempts.",
        reporterType: "ADMIN",
        status: "NEW",
        createdAt: new Date("2026-05-31T15:00:00.000Z"),
        updatedAt: new Date("2026-05-31T15:30:00.000Z"),
        _count: {
          assessments: 1,
          backlogItems: 0,
          adminQuestions: 0,
        },
      },
    ]);
    mockIdeaCount.mockResolvedValue(1);
    mockIdeaGroupBy.mockResolvedValue([{ status: "NEW", _count: { _all: 1 } }]);

    const page = await AdminIdeasPage();
    const text = extractText(page).replace(/\s+/g, " ").trim();

    expect(text).toContain("Unified Ideas");
    expect(text).toContain("Submit Admin Idea");
    expect(text).toContain("Improve lesson completion nudges");
    expect(text).toContain("Add clearer recovery prompts after failed attempts.");
    expect(text).toContain("Reporter: ADMIN");
    expect(text).toContain("Assessments: 1");
    expect(text).toContain("new (1)");
  });
});
