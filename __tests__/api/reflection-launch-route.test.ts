const mockRequireAdminSession = jest.fn();
const mockLaunch = jest.fn();
const mockCompose = jest.fn();
const mockPublish = jest.fn();

jest.mock("@/lib/admin", () => ({ requireAdminSession: (...args: unknown[]) => mockRequireAdminSession(...args) }));
jest.mock("@/lib/reflection-launch", () => ({ launchReflectionCompanionCampaign: (...args: unknown[]) => mockLaunch(...args) }));
jest.mock("@/lib/growth-agents/runners", () => ({
  runSocialListenerDraft: (...args: unknown[]) => mockCompose(...args),
  runSocialPublisher: (...args: unknown[]) => mockPublish(...args),
}));

import { POST } from "@/app/api/admin/reflection-companion/launch/route";

describe("POST /api/admin/reflection-companion/launch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminSession.mockResolvedValue("admin@example.com");
    mockLaunch.mockResolvedValue({ created: true, contentItemId: "content_1", localeCoverage: 8, contentItem: { id: "content_1" } });
    mockCompose.mockResolvedValue({ output: { artifactId: "package_1", localeCoverage: 8 } });
    mockPublish.mockResolvedValue({ output: { published: 5 } });
  });

  it("runs the idempotent owner-approved release before the configured social pipeline", async () => {
    const response = await POST(new Request("http://app:3000/api/admin/reflection-companion/launch", {
      method: "POST",
      headers: { origin: "https://joinaireligion.com", "x-forwarded-host": "joinaireligion.com" },
    }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.safeguards).toMatchObject({ localeCoverage: 8, configuredProvidersOnly: true, noAdSpend: true, idempotent: true });
    expect(mockLaunch.mock.invocationCallOrder[0]).toBeLessThan(mockCompose.mock.invocationCallOrder[0]);
    expect(mockCompose.mock.invocationCallOrder[0]).toBeLessThan(mockPublish.mock.invocationCallOrder[0]);
    expect(mockCompose).toHaveBeenCalledWith(expect.any(Date), { contentItemId: "content_1" });
    expect(mockPublish).toHaveBeenCalledWith(expect.any(Date), { forceRetryFailedProviders: true, artifactId: "package_1" });
  });

  it("rejects a foreign origin before changing content or provider state", async () => {
    const response = await POST(new Request("http://app:3000/api/admin/reflection-companion/launch", {
      method: "POST",
      headers: { origin: "https://attacker.example", "x-forwarded-host": "joinaireligion.com" },
    }));
    expect(response.status).toBe(403);
    expect(mockLaunch).not.toHaveBeenCalled();
    expect(mockCompose).not.toHaveBeenCalled();
    expect(mockPublish).not.toHaveBeenCalled();
  });
});
