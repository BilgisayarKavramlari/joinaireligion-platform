import { spawnSync } from "child_process";
import path from "path";

const script = path.join(process.cwd(), "scripts/ops/check-open-distribution-config.mjs");

function runPreflight(extraEnv: Record<string, string> = {}, provider?: string) {
  const args = [script, ...(provider ? ["--provider", provider] : []), "--require-ready"];
  const result = spawnSync(process.execPath, args, {
    encoding: "utf8",
    env: { PATH: process.env.PATH || "", ...extraEnv },
  });
  return { status: result.status, stderr: result.stderr, report: JSON.parse(result.stdout) as {
    ready: boolean;
    providers: Array<{ provider: string; ready: boolean; missing: string[]; prohibitedActions: string[] }>;
  } };
}

describe("open distribution configuration preflight", () => {
  test("fails closed without global, provider, and secret gates", () => {
    const result = runPreflight({}, "dev");
    expect(result.status).toBe(1);
    expect(result.report.providers[0]).toMatchObject({ provider: "dev", ready: false, missing: ["DEV_API_KEY"] });
  });

  test("recognizes a configured provider without exposing its secret", () => {
    const result = runPreflight({
      DISTRIBUTION_PUBLISHING_ENABLED: "true",
      DEV_PUBLISHING_ENABLED: "true",
      DEV_API_KEY: "do-not-print-this-value",
    }, "dev");
    expect(result.status).toBe(0);
    expect(result.report.providers[0].ready).toBe(true);
    expect(JSON.stringify(result.report)).not.toContain("do-not-print-this-value");
  });

  test("keeps community approval and engagement prohibitions explicit", () => {
    const result = runPreflight({
      DISTRIBUTION_PUBLISHING_ENABLED: "true",
      LEMMY_PUBLISHING_ENABLED: "true",
      LEMMY_INSTANCE_URL: "https://lemmy.example",
      LEMMY_ACCESS_TOKEN: "token",
      LEMMY_COMMUNITY_ID: "7",
    }, "lemmy");
    expect(result.status).toBe(1);
    expect(result.report.providers[0].missing).toContain("LEMMY_COMMUNITY_APPROVED");
    expect(result.report.providers[0].prohibitedActions).toEqual(expect.arrayContaining(["reply", "vote", "sensitive_targeting"]));
    expect(JSON.stringify(result.report)).not.toContain('"token"');
  });
});
