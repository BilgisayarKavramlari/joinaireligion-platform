import { mkdtemp, mkdir, readFile, readdir, rm, chmod, writeFile } from "fs/promises";
import { spawn } from "child_process";
import { tmpdir } from "os";
import path from "path";

const SCRIPT = path.resolve(process.cwd(), "ops/server/joinai-pinterest-token-refresh");

async function executable(file: string, content: string) {
  await writeFile(file, content, { mode: 0o700 });
  await chmod(file, 0o700);
}

async function runScript(options: {
  root: string;
  envFile: string;
  response: string;
  status: string;
}) {
  const bin = path.join(options.root, "bin");
  const runtime = path.join(options.root, "runtime");
  await mkdir(bin);
  await mkdir(runtime);

  await executable(path.join(bin, "flock"), "#!/usr/bin/env bash\nexit 0\n");
  await executable(path.join(bin, "sync"), "#!/usr/bin/env bash\nexit 0\n");
  await executable(path.join(bin, "curl"), `#!/usr/bin/env bash
set -euo pipefail
output=""
while (( $# > 0 )); do
  case "$1" in
    --output) output="$2"; shift 2 ;;
    --config|--write-out) shift 2 ;;
    *) shift ;;
  esac
done
printf '%s' "$MOCK_PINTEREST_RESPONSE" > "$output"
printf '%s' "$MOCK_PINTEREST_STATUS"
`);
  await executable(path.join(bin, "jq"), `#!/usr/bin/env bash
set -euo pipefail
query="$2"
file="$3"
if [[ "$query" == *access_token* ]]; then
  /usr/bin/sed -n 's/.*"access_token":"\\([^"]*\\)".*/\\1/p' "$file"
elif [[ "$query" == *refresh_token* ]]; then
  /usr/bin/sed -n 's/.*"refresh_token":"\\([^"]*\\)".*/\\1/p' "$file"
fi
`);

  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn("/bin/bash", [SCRIPT], {
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH || "/usr/bin:/bin"}`,
        PINTEREST_ENV_FILE: options.envFile,
        PINTEREST_LOCK_FILE: path.join(runtime, "refresh.lock"),
        PINTEREST_RUNTIME_DIR: runtime,
        MOCK_PINTEREST_RESPONSE: options.response,
        MOCK_PINTEREST_STATUS: options.status,
      },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

describe("Pinterest continuous token refresh", () => {
  let root = "";
  let envFile = "";

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "joinai-pinterest-refresh-"));
    envFile = path.join(root, ".env");
    await writeFile(envFile, [
      'PINTEREST_APP_ID="1595764"',
      'PINTEREST_APP_SECRET="app_secret_must_not_be_logged"',
      'PINTEREST_ACCESS_TOKEN="pina_old_must_not_be_logged"',
      'PINTEREST_REFRESH_TOKEN="pinr_old_must_not_be_logged"',
      'PINTEREST_BOARD_ID="123456789"',
      'PINTEREST_PUBLISHING_ENABLED="true"',
      'PINTEREST_ACTIVATED_AT="2026-07-29T12:00:00.000Z"',
      'UNRELATED_SETTING="preserved"',
      "",
    ].join("\n"), { mode: 0o600 });
    await chmod(envFile, 0o600);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("atomically installs both rotated tokens without logging any secret", async () => {
    const result = await runScript({
      root,
      envFile,
      response: '{"access_token":"pina_new_must_not_be_logged","refresh_token":"pinr_new_must_not_be_logged"}',
      status: "200",
    });

    expect(result.code).toBe(0);
    const output = `${result.stdout}\n${result.stderr}`;
    for (const secretFragment of ["app_secret", "pina_old", "pinr_old", "pina_new", "pinr_new"]) {
      expect(output).not.toContain(secretFragment);
    }
    const updated = await readFile(envFile, "utf8");
    expect(updated).toContain('PINTEREST_ACCESS_TOKEN="pina_new_must_not_be_logged"');
    expect(updated).toContain('PINTEREST_REFRESH_TOKEN="pinr_new_must_not_be_logged"');
    expect(updated).toContain('UNRELATED_SETTING="preserved"');
    expect((await readdir(root)).filter((name) => name.startsWith(".pinterest-env."))).toEqual([]);
  });

  it("does not modify the environment or reveal the response body on HTTP failure", async () => {
    const before = await readFile(envFile, "utf8");
    const result = await runScript({
      root,
      envFile,
      response: '{"message":"pinr_server_echo_must_not_be_logged"}',
      status: "401",
    });

    expect(result.code).toBe(1);
    expect(`${result.stdout}\n${result.stderr}`).toContain("HTTP 401");
    expect(`${result.stdout}\n${result.stderr}`).not.toContain("pinr_server_echo");
    expect(await readFile(envFile, "utf8")).toBe(before);
  });
});
