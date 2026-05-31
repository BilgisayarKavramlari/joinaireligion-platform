#!/usr/bin/env bash
# scripts/cron/support-triage.sh
#
# Calls POST /api/cron/support-triage to record a skeleton AgentRun and report
# the current OPEN feedback backlog count.
#
# Required environment variables (loaded from /etc/joinaireligion/cron.env):
#   APP_URL      — base URL of the application, e.g. https://joinaireligion.com
#   CRON_SECRET  — shared secret for Bearer-token auth
#
# Optional:
#   DRY_RUN=1    — print the curl command without executing it
#
# Exit codes:
#   0  — HTTP 200 returned by the endpoint
#   1  — configuration error
#   2  — HTTP error or curl failure

set -euo pipefail

ENV_FILE="${JOINAI_ENV_FILE:-/etc/joinaireligion/cron.env}"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

APP_URL="${APP_URL:-}"
CRON_SECRET="${CRON_SECRET:-}"

if [[ -z "$APP_URL" ]]; then
  echo "[support-triage] ERROR: APP_URL is not set." >&2
  exit 1
fi
if [[ -z "$CRON_SECRET" ]]; then
  echo "[support-triage] ERROR: CRON_SECRET is not set." >&2
  exit 1
fi

ENDPOINT="${APP_URL%/}/api/cron/support-triage"
TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

echo "[support-triage] START $TIMESTAMP"
echo "[support-triage] Endpoint: $ENDPOINT"

CMD=(
  curl
    --silent
    --show-error
    --fail-with-body
    --max-time 60
    --retry 2
    --retry-delay 5
    -X POST
    -H "Authorization: Bearer ${CRON_SECRET}"
    -H "Content-Type: application/json"
    "$ENDPOINT"
)

if [[ "${DRY_RUN:-0}" == "1" ]]; then
  echo "[support-triage] DRY_RUN — would execute:"
  echo "  curl --silent --show-error --fail-with-body --max-time 60 --retry 2 --retry-delay 5 \\"
  echo "    -X POST \\"
  echo "    -H 'Authorization: Bearer ***' \\"
  echo "    -H 'Content-Type: application/json' \\"
  echo "    '${ENDPOINT}'"
  exit 0
fi

RESPONSE="$("${CMD[@]}" 2>&1)"
HTTP_STATUS=$?

echo "[support-triage] Response: $RESPONSE"

if [[ $HTTP_STATUS -ne 0 ]]; then
  echo "[support-triage] FAILED (curl exit $HTTP_STATUS)" >&2
  exit 2
fi

echo "[support-triage] DONE $TIMESTAMP"
exit 0
