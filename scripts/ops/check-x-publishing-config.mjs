#!/usr/bin/env node

const oauth1Fields = [
  "X_API_KEY",
  "X_API_SECRET",
  "X_ACCESS_TOKEN",
  "X_ACCESS_TOKEN_SECRET",
];

const publishingEnabled = process.env.X_PUBLISHING_ENABLED === "true";
const oauth2Configured = Boolean(process.env.X_USER_ACCESS_TOKEN?.trim());
const missingOAuth1Fields = oauth1Fields.filter((key) => !process.env[key]?.trim());
const oauth1Configured = missingOAuth1Fields.length === 0;

let authMode = "none";
if (oauth2Configured) authMode = "oauth2_static_user_token";
else if (oauth1Configured) authMode = "oauth1_owner_context";

const ready = publishingEnabled && authMode !== "none";
const warnings = [];
if (oauth2Configured) {
  warnings.push("oauth2_refresh_is_not_implemented_use_oauth1_or_add_refresh_rotation_before_unattended_runtime");
}
if (publishingEnabled && authMode === "none") {
  warnings.push("publishing_enabled_without_complete_user_context_credentials");
}
if (!publishingEnabled) warnings.push("publishing_switch_is_off");

const report = {
  provider: "x",
  ready,
  publishingEnabled,
  authMode,
  missingOAuth1Fields: oauth1Configured || oauth2Configured ? [] : missingOAuth1Fields,
  requiredOAuth2Scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
  endpoint: "https://api.x.com/2/tweets",
  allowedAction: "create_text_post_only",
  prohibitedActions: ["reply", "direct_message", "like", "follow", "repost"],
  warnings,
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (process.argv.includes("--require-ready") && !ready) process.exitCode = 1;
