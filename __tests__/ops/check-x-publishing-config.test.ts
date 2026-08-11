import { spawnSync } from "child_process";
import path from "path";

const script = path.join(process.cwd(), "scripts/ops/check-x-publishing-config.mjs");

function runPreflight(extraEnv: Record<string, string> = {}, requireReady = false) {
  const result = spawnSync(process.execPath, [script, ...(requireReady ? ["--require-ready"] : [])], {
    encoding: "utf8",
    env: { PATH: process.env.PATH || "", ...extraEnv },
  });
  return {
    status: result.status,
    stderr: result.stderr,
    report: JSON.parse(result.stdout) as {
      ready: boolean;
      publishingEnabled: boolean;
      authMode: string;
      missingOAuth1Fields: string[];
      requiredOAuth2Scopes: string[];
      allowedAction: string;
      prohibitedActions: string[];
      warnings: string[];
    },
  };
}

describe("X publishing configuration preflight", () => {
  it("fails closed without credentials and never requires a secret value in output", () => {
    const result = runPreflight({ X_PUBLISHING_ENABLED: "true" }, true);

    expect(result.status).toBe(1);
    expect(result.stderr).toBe("");
    expect(result.report).toMatchObject({
      ready: false,
      publishingEnabled: true,
      authMode: "none",
      allowedAction: "create_text_post_only",
    });
    expect(result.report.missingOAuth1Fields).toEqual([
      "X_API_KEY",
      "X_API_SECRET",
      "X_ACCESS_TOKEN",
      "X_ACCESS_TOKEN_SECRET",
    ]);
    expect(result.report.prohibitedActions).toEqual(["reply", "direct_message", "like", "follow", "repost"]);
  });

  it("recognizes a complete OAuth 1.0a owner-context configuration", () => {
    const result = runPreflight({
      X_PUBLISHING_ENABLED: "true",
      X_API_KEY: "fake-api-key",
      X_API_SECRET: "fake-api-secret",
      X_ACCESS_TOKEN: "fake-access-token",
      X_ACCESS_TOKEN_SECRET: "fake-access-token-secret",
    }, true);

    expect(result.status).toBe(0);
    expect(result.report).toMatchObject({ ready: true, authMode: "oauth1_owner_context" });
    expect(result.report.missingOAuth1Fields).toEqual([]);
    expect(result.report.requiredOAuth2Scopes).toEqual([
      "tweet.read",
      "tweet.write",
      "users.read",
      "offline.access",
    ]);
    expect(JSON.stringify(result.report)).not.toContain("fake-api-secret");
    expect(JSON.stringify(result.report)).not.toContain("fake-access-token-secret");
  });

  it("flags the current static OAuth 2.0 token path as unsuitable for unattended renewal", () => {
    const result = runPreflight({
      X_PUBLISHING_ENABLED: "true",
      X_USER_ACCESS_TOKEN: "fake-user-token",
    }, true);

    expect(result.status).toBe(0);
    expect(result.report).toMatchObject({ ready: true, authMode: "oauth2_static_user_token" });
    expect(result.report.warnings).toContain(
      "oauth2_refresh_is_not_implemented_use_oauth1_or_add_refresh_rotation_before_unattended_runtime",
    );
    expect(JSON.stringify(result.report)).not.toContain("fake-user-token");
  });
});
