const mockRequireAdminSession = jest.fn();
const mockRunSocialPublisher = jest.fn();

jest.mock("@/lib/admin", () => ({
  requireAdminSession: (...args: unknown[]) => mockRequireAdminSession(...args),
}));

jest.mock("@/lib/growth-agents/runners", () => ({
  runSocialPublisher: (...args: unknown[]) => mockRunSocialPublisher(...args),
}));

import { POST } from "@/app/api/admin/autonomy/social-publisher/route";

describe("POST /api/admin/autonomy/social-publisher", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminSession.mockResolvedValue("admin@example.com");
    mockRunSocialPublisher.mockResolvedValue({ published: 1, complete: true });
  });

  it("accepts the public origin behind the production reverse proxy", async () => {
    const response = await POST(new Request("http://app:3000/api/admin/autonomy/social-publisher", {
      method: "POST",
      headers: {
        origin: "https://joinaireligion.com",
        host: "app:3000",
        "x-forwarded-host": "joinaireligion.com",
      },
    }));

    expect(response.status).toBe(200);
    expect(mockRunSocialPublisher).toHaveBeenCalledWith(expect.any(Date), { forceRetryFailedProviders: true });
  });

  it("rejects a cross-origin retry request", async () => {
    const response = await POST(new Request("http://app:3000/api/admin/autonomy/social-publisher", {
      method: "POST",
      headers: {
        origin: "https://attacker.example",
        "x-forwarded-host": "joinaireligion.com",
      },
    }));

    expect(response.status).toBe(403);
    expect(mockRunSocialPublisher).not.toHaveBeenCalled();
  });
});
