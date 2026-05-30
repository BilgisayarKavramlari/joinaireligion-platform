#!/usr/bin/env bash
# scripts/ops/openclaw-run-deploy-status.sh
#
# OpenClaw — deployment status probe.
#
# Calls GET /api/admin/autonomy/deploy-status and emits JSON to stdout.
# Returns current git commit, build timestamp, DB connectivity, last agent
# runs, generation mode, and email mode.
#
# Safe to run repeatedly (read-only, no mutations).
#
# Output (stdout, JSON):
#   { "gitCommit": "...", "buildTimestamp": "...", "dbConnected": true,
#     "generationMode": "placeholder"|"openai",
#     "emailMode": "LOG_ONLY"|"LIVE", "emailSendingEnabled": false,
#     "lastAgentRuns": { ... } }
#
# Exit codes:
#   0  — success
#   1  — configuration error
#   2  — HTTP or curl failure
#
# Secret safety: CRON_SECRET is never printed.
#
# Usage:
#   scripts/ops/openclaw-run-deploy-status.sh
#   DRY_RUN=1 scripts/ops/openclaw-run-deploy-status.sh

set -euo pipefail

ENV_FILE="${JOINAI_ENV_FILE:-/etc/joinaireligion/cron.env}"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

APP_URL="${APP_URL:-}"
CRON_SECRET="${CRON_SECRET:-}"

if [[ -z "$APP_URL" ]]; then
  echo '{"error":"APP_URL is not set","status":"CONFIG_ERROR"}' >&2; exit 1
fi
if [[ -z "$CRON_SECRET" ]]; then
  echo '{"error":"CRON_SECRET is not set","status":"CONFIG_ERROR"}' >&2; exit 1
fi

ENDPOINT="${APP_URL%/}/api/admin/autonomy/deploy-status"

if [[ "${DRY_RUN:-0}" == "1" ]]; then
  echo '{"dryRun":true,"endpoint":"'"$ENDPOINT"'","wouldUse":"Bearer ***"}'
  exit 0
fi

RESPONSE="$(
  curl --silent --show-error --max-time 30 \
    -H "Authorization: Bearer ${CRON_SECRET}" \
    "$ENDPOINT" 2>&1
)"
CURL_EXIT=$?

if [[ $CURL_EXIT -ne 0 ]]; then
  echo '{"error":"curl failed (exit '"$CURL_EXIT"')","status":"NETWORK_ERROR"}' >&2
  exit 2
fi

echo "$RESPONSE"
exit 0
