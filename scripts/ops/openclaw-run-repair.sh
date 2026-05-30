#!/usr/bin/env bash
# scripts/ops/openclaw-run-repair.sh
#
# OpenClaw — safe autonomous repair.
#
# Calls POST /api/cron/autonomy-repair which applies only non-destructive
# data corrections (create missing UserJourneyState rows, requeue stuck
# messages, score unscored responses, regenerate missing practices).
#
# Fully idempotent — safe to run unconditionally and repeatedly.
#
# Output (stdout, JSON):
#   { "ok": true, "totalFixed": N, "repairs": [...], "errors": N }
#
# Exit codes:
#   0  — repair completed (check totalFixed in output for counts)
#   1  — configuration error
#   2  — HTTP or curl failure
#
# Secret safety: CRON_SECRET is never printed.
#
# Usage:
#   scripts/ops/openclaw-run-repair.sh
#   DRY_RUN=1 scripts/ops/openclaw-run-repair.sh

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

ENDPOINT="${APP_URL%/}/api/cron/autonomy-repair"

if [[ "${DRY_RUN:-0}" == "1" ]]; then
  echo '{"dryRun":true,"endpoint":"'"$ENDPOINT"'","wouldUse":"Bearer ***"}'
  exit 0
fi

RESPONSE="$(
  curl --silent --show-error --fail-with-body --max-time 120 --retry 2 --retry-delay 5 \
    -X POST \
    -H "Authorization: Bearer ${CRON_SECRET}" \
    -H "Content-Type: application/json" \
    "$ENDPOINT" 2>&1
)"
CURL_EXIT=$?

echo "$RESPONSE"

if [[ $CURL_EXIT -ne 0 ]]; then
  exit 2
fi

exit 0
