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

  test("requires Flipboard approval after the public RSS package is available", () => {
    const blocked = runPreflight({
      DISTRIBUTION_PUBLISHING_ENABLED: "true",
      FLIPBOARD_PUBLISHING_ENABLED: "true",
    }, "flipboard");
    expect(blocked.status).toBe(1);
    expect(blocked.report.providers[0]).toMatchObject({
      provider: "flipboard",
      ready: false,
      missing: ["FLIPBOARD_SUBMISSION_APPROVED"],
    });

    const ready = runPreflight({
      DISTRIBUTION_PUBLISHING_ENABLED: "true",
      FLIPBOARD_PUBLISHING_ENABLED: "true",
      FLIPBOARD_SUBMISSION_APPROVED: "true",
    }, "flipboard");
    expect(ready.status).toBe(0);
    expect(ready.report.providers[0].ready).toBe(true);
  });

  test("requires Apple News channel approval and every API credential name", () => {
    const blocked = runPreflight({
      DISTRIBUTION_PUBLISHING_ENABLED: "true",
      APPLE_NEWS_PUBLISHING_ENABLED: "true",
      APPLE_NEWS_CHANNEL_ID: "11111111-1111-1111-1111-111111111111",
      APPLE_NEWS_KEY_ID: "key-id",
    }, "appleNews");
    expect(blocked.status).toBe(1);
    expect(blocked.report.providers[0].missing).toEqual([
      "APPLE_NEWS_KEY_SECRET",
      "APPLE_NEWS_CHANNEL_APPROVED",
    ]);

    const ready = runPreflight({
      DISTRIBUTION_PUBLISHING_ENABLED: "true",
      APPLE_NEWS_PUBLISHING_ENABLED: "true",
      APPLE_NEWS_CHANNEL_ID: "11111111-1111-1111-1111-111111111111",
      APPLE_NEWS_KEY_ID: "key-id",
      APPLE_NEWS_KEY_SECRET: "do-not-print-apple-secret",
      APPLE_NEWS_CHANNEL_APPROVED: "true",
    }, "appleNews");
    expect(ready.status).toBe(0);
    expect(JSON.stringify(ready.report)).not.toContain("do-not-print-apple-secret");
  });

  test("keeps LINE limited to opted-in broadcast and never reports its token", () => {
    const result = runPreflight({
      DISTRIBUTION_PUBLISHING_ENABLED: "true",
      LINE_PUBLISHING_ENABLED: "true",
      LINE_CHANNEL_ACCESS_TOKEN: "do-not-print-line-token",
    }, "line");
    expect(result.status).toBe(0);
    expect(result.report.providers[0]).toMatchObject({ provider: "line", ready: true });
    expect(result.report.providers[0].prohibitedActions).toEqual(expect.arrayContaining([
      "direct_message",
      "sensitive_targeting",
    ]));
    expect(JSON.stringify(result.report)).not.toContain("do-not-print-line-token");
  });
});
