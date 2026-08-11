jest.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "https://joinaireligion.com",
    CRON_SECRET: "analytics-test-secret",
    ANALYTICS_TRUSTED_COUNTRY_HEADERS: undefined,
  },
}));

const create = jest.fn();
jest.mock("@/lib/db", () => ({ db: { userActivityLog: { create: (...args: unknown[]) => create(...args) } } }));

import { POST } from "@/app/api/analytics/events/route";

describe("analytics event endpoint", () => {
  beforeEach(() => jest.clearAllMocks());

  it("stores a minimized event without raw network or browser identifiers", async () => {
    create.mockResolvedValue({ id: "event_1" });
    const request = new Request("https://joinaireligion.com/api/analytics/events", {
      method: "POST",
      headers: {
        origin: "https://joinaireligion.com",
        "content-type": "application/json",
        "user-agent": "Mozilla/5.0",
        "x-real-ip": "198.51.100.7",
        "cf-ipcountry": "US",
      },
      body: JSON.stringify({
        event: "page_view",
        sessionId: "9a1b2c3d-4e5f-6789-abcd-0123456789ab",
        path: "/content/en/example?secret=value",
        source: "instagram",
        campaign: "organic_reflection_2026-08-11",
        locale: "en",
      }),
    });
    const response = await POST(request as never);
    expect(response.status).toBe(201);
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({
      eventName: "analytics_page_view",
      path: "/content/en/example",
      ipHash: null,
      userAgent: null,
      anonymousSessionId: expect.stringMatching(/^[a-f0-9]{64}$/),
      metadata: expect.objectContaining({ source: "instagram", country: null }),
    }) });
    expect(JSON.stringify(create.mock.calls)).not.toContain("198.51.100.7");
    expect(JSON.stringify(create.mock.calls)).not.toContain("secret=value");
  });

  it("rejects cross-origin and administrative page events", async () => {
    const crossOrigin = await POST(new Request("https://joinaireligion.com/api/analytics/events", {
      method: "POST",
      headers: { origin: "https://attacker.example", "content-type": "application/json" },
      body: JSON.stringify({ event: "page_view", path: "/" }),
    }) as never);
    expect(crossOrigin.status).toBe(403);

    const admin = await POST(new Request("https://joinaireligion.com/api/analytics/events", {
      method: "POST",
      headers: { origin: "https://joinaireligion.com", "content-type": "application/json" },
      body: JSON.stringify({ event: "page_view", path: "/admin" }),
    }) as never);
    expect(admin.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });
});
