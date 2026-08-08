#!/usr/bin/env bash
# scripts/ops/openclaw-run-health.sh
#
# OpenClaw — system health probe.
#
# Calls GET /api/cron/autonomy-health and emits structured JSON to stdout.
# Safe to run repeatedly (read-only, no mutations).
#
# Output (stdout, JSON):
#   { "status": "OK"|"WARNING"|"CRITICAL", "checkedAt": "...",
#     "findings": [...], "recommendedActions": [...],
#     "safeAutoFixActions": [...], "requiresHumanApproval": [...] }
#
# Exit codes:
#   0  — status OK or WARNING
#   1  — configuration error (APP_URL or CRON_SECRET not set)
#   2  — status CRITICAL or HTTP error
#
# Secret safety: CRON_SECRET is read from env and sent as a Bearer header.
# Its value is never printed to stdout or stderr.
#
# Usage:
#   scripts/ops/openclaw-run-health.sh
#   DRY_RUN=1 scripts/ops/openclaw-run-health.sh

set -euo pipefail

# ── Load env ───────────────────────────────────────────────────────────────────
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

ENDPOINT="${APP_URL%/}/api/cron/autonomy-health"

if [[ "${DRY_RUN:-0}" == "1" ]]; then
  echo '{"dryRun":true,"endpoint":"'"$ENDPOINT"'","wouldUse":"Bearer ***"}'
  exit 0
fi

# ── Call endpoint ──────────────────────────────────────────────────────────────
if RESPONSE="$(
  curl --silent --show-error --fail-with-body --max-time 30 --retry 1 \
    -H "Authorization: Bearer ${CRON_SECRET}" \
    "$ENDPOINT" 2>&1
)"; then
  CURL_EXIT=0
else
  CURL_EXIT=$?
fi

if [[ $CURL_EXIT -ne 0 ]]; then
  echo '{"error":"curl failed (exit '"$CURL_EXIT"')","status":"NETWORK_ERROR"}' >&2
  exit 2
fi

# ── Emit response to stdout ────────────────────────────────────────────────────
echo "$RESPONSE"

# ── Exit code based on health status ──────────────────────────────────────────
STATUS="$(python3 -c "
import sys, json
try:
    d = json.loads(sys.stdin.read())
    print(d.get('status','UNKNOWN'))
except:
    print('PARSE_ERROR')
" <<< "$RESPONSE")"

if [[ "$STATUS" == "CRITICAL" ]]; then
  exit 2
fi

exit 0
