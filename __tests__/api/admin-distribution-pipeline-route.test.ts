const mockRequireAdminSession = jest.fn();
const mockRunSeoKulliyatDraft = jest.fn();
const mockRunContentPublisher = jest.fn();
const mockRunSocialListenerDraft = jest.fn();
const mockRunSocialPublisher = jest.fn();
const mockRunLongFormDistributionPublisher = jest.fn();

jest.mock("@/lib/admin", () => ({
  requireAdminSession: (...args: unknown[]) => mockRequireAdminSession(...args),
}));

jest.mock("@/lib/growth-agents/runners", () => ({
  runSeoKulliyatDraft: (...args: unknown[]) => mockRunSeoKulliyatDraft(...args),
  runContentPublisher: (...args: unknown[]) => mockRunContentPublisher(...args),
  runSocialListenerDraft: (...args: unknown[]) => mockRunSocialListenerDraft(...args),
  runSocialPublisher: (...args: unknown[]) => mockRunSocialPublisher(...args),
  runLongFormDistributionPublisher: (...args: unknown[]) => mockRunLongFormDistributionPublisher(...args),
}));

import { POST } from "@/app/api/admin/autonomy/distribution-pipeline/route";

describe("POST /api/admin/autonomy/distribution-pipeline", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminSession.mockResolvedValue("admin@example.com");
    mockRunSeoKulliyatDraft.mockResolvedValue({ output: { localeCoverage: 8 } });
    mockRunContentPublisher.mockResolvedValue({ output: { published: 1 } });
    mockRunSocialListenerDraft.mockResolvedValue({ output: { localeCoverage: 8 } });
    mockRunSocialPublisher.mockResolvedValue({ output: { published: 5 } });
    mockRunLongFormDistributionPublisher.mockResolvedValue({ output: { published: 0, skipped: true } });
  });

  it("runs the audited multilingual chain in order behind the production proxy", async () => {
    const response = await POST(new Request("http://app:3000/api/admin/autonomy/distribution-pipeline", {
      method: "POST",
      headers: {
        origin: "https://joinaireligion.com",
        host: "app:3000",
        "x-forwarded-host": "joinaireligion.com",
      },
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.safeguards).toMatchObject({
      locales: ["en", "tr", "es", "de", "fr", "ar", "ru", "zh"],
      separateSiteVariants: true,
      dailyContentCapPreserved: true,
      engagementActionsDisabled: true,
    });
    expect(mockRunSeoKulliyatDraft).toHaveBeenCalledWith(expect.any(Date));
    expect(mockRunContentPublisher).toHaveBeenCalledWith(expect.any(Date));
    expect(mockRunSocialListenerDraft).toHaveBeenCalledWith(expect.any(Date));
    expect(mockRunSocialPublisher).toHaveBeenCalledWith(expect.any(Date), { forceRetryFailedProviders: true });
    expect(mockRunLongFormDistributionPublisher).toHaveBeenCalledWith(expect.any(Date));
    expect(mockRunSeoKulliyatDraft.mock.invocationCallOrder[0]).toBeLessThan(mockRunContentPublisher.mock.invocationCallOrder[0]);
    expect(mockRunContentPublisher.mock.invocationCallOrder[0]).toBeLessThan(mockRunSocialListenerDraft.mock.invocationCallOrder[0]);
    expect(mockRunSocialListenerDraft.mock.invocationCallOrder[0]).toBeLessThan(mockRunSocialPublisher.mock.invocationCallOrder[0]);
    expect(mockRunSocialPublisher.mock.invocationCallOrder[0]).toBeLessThan(mockRunLongFormDistributionPublisher.mock.invocationCallOrder[0]);
  });

  it("rejects a cross-origin publication request before running an agent", async () => {
    const response = await POST(new Request("http://app:3000/api/admin/autonomy/distribution-pipeline", {
      method: "POST",
      headers: {
        origin: "https://attacker.example",
        "x-forwarded-host": "joinaireligion.com",
      },
    }));

    expect(response.status).toBe(403);
    expect(mockRunSeoKulliyatDraft).not.toHaveBeenCalled();
    expect(mockRunContentPublisher).not.toHaveBeenCalled();
    expect(mockRunSocialListenerDraft).not.toHaveBeenCalled();
    expect(mockRunSocialPublisher).not.toHaveBeenCalled();
    expect(mockRunLongFormDistributionPublisher).not.toHaveBeenCalled();
  });
});
