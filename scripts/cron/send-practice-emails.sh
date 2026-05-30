#!/usr/bin/env bash
# scripts/cron/send-practice-emails.sh
#
# Calls POST /api/cron/send-practice-emails to deliver queued PracticeMessage
# records to users via the configured email provider.
#
# Required environment variables (loaded from /etc/joinaireligion/cron.env):
#   APP_URL      — base URL of the application, e.g. https://joinaireligion.com
#   CRON_SECRET  — shared secret for Bearer-token auth
#
# Optional:
#   EMAIL_MODE   — delivery mode forwarded as ?mode= query parameter
#                  LIVE (default in production), LOG_ONLY, or DRY_RUN
#   DRY_RUN=1    — print the curl command without executing it
#
# Typical crontab entry (run daily at 07:00 UTC, after generate-practices):
#   0 7 * * * /opt/joinaireligion/scripts/cron/send-practice-emails.sh >> /var/log/joinaireligion/cron.log 2>&1
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
EMAIL_MODE="${EMAIL_MODE:-LIVE}"

if [[ -z "$APP_URL" ]]; then
  echo "[send-practice-emails] ERROR: APP_URL is not set." >&2
  exit 1
fi
if [[ -z "$CRON_SECRET" ]]; then
  echo "[send-practice-emails] ERROR: CRON_SECRET is not set." >&2
  exit 1
fi

# Validate EMAIL_MODE
if [[ "$EMAIL_MODE" != "LIVE" && "$EMAIL_MODE" != "LOG_ONLY" && "$EMAIL_MODE" != "DRY_RUN" ]]; then
  echo "[send-practice-emails] ERROR: EMAIL_MODE must be LIVE, LOG_ONLY, or DRY_RUN (got: $EMAIL_MODE)" >&2
  exit 1
fi

# ── Build request ─────────────────────────────────────────────────────────────
ENDPOINT="${APP_URL%/}/api/cron/send-practice-emails?mode=${EMAIL_MODE}"
TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

echo "[send-practice-emails] START $TIMESTAMP"
echo "[send-practice-emails] Endpoint: $ENDPOINT"
echo "[send-practice-emails] Mode: $EMAIL_MODE"

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
  echo "[send-practice-emails] DRY_RUN — would execute:"
  echo "  curl --silent --show-error --fail-with-body --max-time 120 --retry 2 --retry-delay 5 \\"
  echo "    -X POST \\"
  echo "    -H 'Authorization: Bearer ***' \\"
  echo "    -H 'Content-Type: application/json' \\"
  echo "    '${APP_URL%/}/api/cron/send-practice-emails?mode=${EMAIL_MODE}'"
  exit 0
fi

# ── Execute ───────────────────────────────────────────────────────────────────
RESPONSE="$("${CMD[@]}" 2>&1)"
HTTP_STATUS=$?

echo "[send-practice-emails] Response: $RESPONSE"

if [[ $HTTP_STATUS -ne 0 ]]; then
  echo "[send-practice-emails] FAILED (curl exit $HTTP_STATUS)" >&2
  exit 2
fi

echo "[send-practice-emails] DONE $TIMESTAMP"
exit 0
