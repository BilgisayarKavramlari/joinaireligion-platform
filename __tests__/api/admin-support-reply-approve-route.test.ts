const mockRequireAdminSession = jest.fn();
const mockSupportReplyFindUnique = jest.fn();
const mockSupportReplyUpdate = jest.fn();
const mockFeedbackUpdate = jest.fn();
const mockRevalidatePath = jest.fn();

jest.mock("@/lib/admin", () => ({
  requireAdminSession: (...args: unknown[]) => mockRequireAdminSession(...args),
}));

jest.mock("@/lib/db", () => ({
  db: {
    supportReply: {
      findUnique: (...args: unknown[]) => mockSupportReplyFindUnique(...args),
      update: (...args: unknown[]) => mockSupportReplyUpdate(...args),
    },
    feedbackItem: {
      update: (...args: unknown[]) => mockFeedbackUpdate(...args),
    },
  },
}));

jest.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

import { POST } from "@/app/api/admin/support-replies/[id]/approve/route";

describe("POST /api/admin/support-replies/[id]/approve", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("allows an admin to approve an ADMIN_ONLY draft reply for user visibility", async () => {
    mockRequireAdminSession.mockResolvedValue("admin@example.com");
    mockSupportReplyFindUnique.mockResolvedValue({
      id: "reply_1",
      feedbackItemId: "fb_1",
      visibility: "ADMIN_ONLY",
      status: "DRAFT",
    });
    mockSupportReplyUpdate.mockResolvedValue({
      id: "reply_1",
      feedbackItemId: "fb_1",
      visibility: "USER_VISIBLE",
      status: "APPROVED",
      updatedAt: new Date("2026-05-31T18:48:00.000Z"),
    });

    const response = await POST(new Request("http://localhost/api/admin/support-replies/reply_1/approve", { method: "POST" }), {
      params: Promise.resolve({ id: "reply_1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockSupportReplyUpdate).toHaveBeenCalledWith({
      where: { id: "reply_1" },
      data: {
        visibility: "USER_VISIBLE",
        status: "APPROVED",
      },
      select: {
        id: true,
        feedbackItemId: true,
        visibility: true,
        status: true,
        updatedAt: true,
      },
    });
    expect(body.ok).toBe(true);
    expect(body.reply.visibility).toBe("USER_VISIBLE");
    expect(body.reply.status).toBe("APPROVED");
    expect(mockFeedbackUpdate).not.toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/feedback");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/account/support");
  });

  it("rejects non-admin approval attempts", async () => {
    mockRequireAdminSession.mockRejectedValue(new Error("FORBIDDEN_ADMIN"));

    const response = await POST(new Request("http://localhost/api/admin/support-replies/reply_1/approve", { method: "POST" }), {
      params: Promise.resolve({ id: "reply_1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: "Forbidden" });
    expect(mockSupportReplyFindUnique).not.toHaveBeenCalled();
    expect(mockSupportReplyUpdate).not.toHaveBeenCalled();
  });

  it("does not approve replies that are already user-visible, sent, or archived", async () => {
    mockRequireAdminSession.mockResolvedValue("admin@example.com");
    mockSupportReplyFindUnique.mockResolvedValue({
      id: "reply_sent",
      feedbackItemId: "fb_1",
      visibility: "USER_VISIBLE",
      status: "SENT",
    });

    const response = await POST(new Request("http://localhost/api/admin/support-replies/reply_sent/approve", { method: "POST" }), {
      params: Promise.resolve({ id: "reply_sent" }),
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toContain("Only ADMIN_ONLY draft replies");
    expect(mockSupportReplyUpdate).not.toHaveBeenCalled();
    expect(mockFeedbackUpdate).not.toHaveBeenCalled();
  });
});
