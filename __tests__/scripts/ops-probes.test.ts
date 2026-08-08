import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

describe("operations probes", () => {
  let fakeBin: string;

  beforeEach(() => {
    fakeBin = mkdtempSync(join(tmpdir(), "joinai-probes-"));
    const fakeCurl = join(fakeBin, "curl");
    writeFileSync(fakeCurl, "#!/bin/sh\nexit 22\n", "utf8");
    chmodSync(fakeCurl, 0o755);
  });

  afterEach(() => {
    rmSync(fakeBin, { recursive: true, force: true });
  });

  function run(script: string) {
    return spawnSync("bash", [script], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        APP_URL: "https://example.invalid",
        CRON_SECRET: "test-secret",
        JOINAI_ENV_FILE: join(fakeBin, "missing.env"),
        PATH: `${fakeBin}:/usr/bin:/bin`,
      },
    });
  }

  it.each([
    "scripts/cron/autonomy-health.sh",
    "scripts/ops/openclaw-run-health.sh",
    "scripts/ops/openclaw-run-deploy-status.sh",
  ])("maps curl failures to the documented exit code: %s", (script) => {
    const result = run(script);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("curl");
  });

  it("fails the email status probe when either HTTP dependency fails", () => {
    const result = run("scripts/ops/openclaw-run-email-status.sh");

    expect(result.status).toBe(2);
    expect(result.stdout).toContain('"ok": false');
  });
});
