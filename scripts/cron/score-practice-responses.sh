#!/usr/bin/env bash
# scripts/cron/score-practice-responses.sh
#
# Calls POST /api/cron/score-practice-responses to deterministically score
# unscored PracticeResponse records and award XP to users.
#
# Required environment variables (loaded from /etc/joinaireligion/cron.env):
#   APP_URL      — base URL of the application, e.g. https://joinaireligion.com
#   CRON_SECRET  — shared secret for Bearer-token auth
#
# Optional:
#   DRY_RUN=1    — print the curl command without executing it
#
# Typical crontab entry (run every hour, offset by 30 min from email send):
#   30 * * * * /opt/joinaireligion/scripts/cron/score-practice-responses.sh >> /var/log/joinaireligion/cron.log 2>&1
#
# Exit codes:
#   0  — HTTP 200 returned by the endpoint
#   1  — configuration error
#   2  — HTTP error or curl failure

set -euo pipefail

# ── Load environment ──────────────────────────────────────────────────────────
ENV_FILE="${JOINAI_ENV_FILE:-/etc/joinaireligion/cron.env}"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

APP_URL="${APP_URL:-}"
CRON_SECRET="${CRON_SECRET:-}"

if [[ -z "$APP_URL" ]]; then
  echo "[score-practice-responses] ERROR: APP_URL is not set." >&2
  exit 1
fi
if [[ -z "$CRON_SECRET" ]]; then
  echo "[score-practice-responses] ERROR: CRON_SECRET is not set." >&2
  exit 1
fi

# ── Build request ─────────────────────────────────────────────────────────────
ENDPOINT="${APP_URL%/}/api/cron/score-practice-responses"
TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

echo "[score-practice-responses] START $TIMESTAMP"
echo "[score-practice-responses] Endpoint: $ENDPOINT"

CMD=(
  curl
    --silent
    --show-error
    --fail-with-body
    --max-time 120
    --retry 2
    --retry-delay 5
    -X POST
    -H "Authorization: Bearer ${CRON_SECRET}"
    -H "Content-Type: application/json"
    "$ENDPOINT"
)

# ── Dry-run mode ──────────────────────────────────────────────────────────────
if [[ "${DRY_RUN:-0}" == "1" ]]; then
  echo "[score-practice-responses] DRY_RUN — would execute:"
  echo "  curl --silent --show-error --fail-with-body --max-time 120 --retry 2 --retry-delay 5 \\"
  echo "    -X POST \\"
  echo "    -H 'Authorization: Bearer ***' \\"
  echo "    -H 'Content-Type: application/json' \\"
  echo "    '${ENDPOINT}'"
  exit 0
fi

# ── Execute ───────────────────────────────────────────────────────────────────
RESPONSE="$("${CMD[@]}" 2>&1)"
HTTP_STATUS=$?

echo "[score-practice-responses] Response: $RESPONSE"

if [[ $HTTP_STATUS -ne 0 ]]; then
  echo "[score-practice-responses] FAILED (curl exit $HTTP_STATUS)" >&2
  exit 2
fi

echo "[score-practice-responses] DONE $TIMESTAMP"
exit 0
