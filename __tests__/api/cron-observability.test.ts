jest.mock("@/lib/env", () => ({ env: { CRON_SECRET: "cron-test-secret" } }));

const mockBuildHealth = jest.fn();
const mockBuildDeployStatus = jest.fn();

jest.mock("@/app/api/admin/autonomy/health/route", () => ({
  buildAutonomyHealthReport: () => mockBuildHealth(),
}));

jest.mock("@/app/api/admin/autonomy/deploy-status/route", () => ({
  buildDeployStatusReport: () => mockBuildDeployStatus(),
}));

import { NextRequest } from "next/server";
import { GET as healthGET } from "@/app/api/cron/autonomy-health/route";
import { GET as deployStatusGET } from "@/app/api/cron/deploy-status/route";

function request(path: string, authorized = false): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    headers: authorized ? { authorization: "Bearer cron-test-secret" } : {},
  });
}

describe("cron observability endpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBuildHealth.mockResolvedValue({ status: "OK", findings: [] });
    mockBuildDeployStatus.mockResolvedValue({ dbConnected: true, lastAgentRuns: {} });
  });

  it("keeps the health report behind the exact cron token", async () => {
    const unauthorized = await healthGET(request("/api/cron/autonomy-health"));
    expect(unauthorized.status).toBe(401);
    expect(mockBuildHealth).not.toHaveBeenCalled();

    const authorized = await healthGET(request("/api/cron/autonomy-health", true));
    expect(authorized.status).toBe(200);
    await expect(authorized.json()).resolves.toMatchObject({ status: "OK" });
  });

  it("keeps deployment verification behind the exact cron token", async () => {
    const unauthorized = await deployStatusGET(request("/api/cron/deploy-status"));
    expect(unauthorized.status).toBe(401);
    expect(mockBuildDeployStatus).not.toHaveBeenCalled();

    const authorized = await deployStatusGET(request("/api/cron/deploy-status", true));
    expect(authorized.status).toBe(200);
    await expect(authorized.json()).resolves.toMatchObject({ dbConnected: true });
  });
});
