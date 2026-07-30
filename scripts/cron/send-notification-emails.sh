#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${JOINAI_ENV_FILE:-/etc/joinaireligion/cron.env}"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

APP_URL="${APP_URL:-}"
CRON_SECRET="${CRON_SECRET:-}"
EMAIL_MODE="${EMAIL_MODE:-LIVE}"
if [[ -z "$APP_URL" || -z "$CRON_SECRET" ]]; then
  echo "[send-notification-emails] ERROR: APP_URL and CRON_SECRET are required." >&2
  exit 1
fi
if [[ "$EMAIL_MODE" != "LIVE" && "$EMAIL_MODE" != "LOG_ONLY" && "$EMAIL_MODE" != "DRY_RUN" ]]; then
  echo "[send-notification-emails] ERROR: invalid EMAIL_MODE." >&2
  exit 1
fi

ENDPOINT="${APP_URL%/}/api/cron/send-notification-emails?mode=${EMAIL_MODE}"
echo "[send-notification-emails] START $(date -u +"%Y-%m-%dT%H:%M:%SZ") mode=${EMAIL_MODE}"
if [[ "${DRY_RUN:-0}" == "1" ]]; then
  echo "[send-notification-emails] DRY_RUN — POST $ENDPOINT with redacted Bearer token"
  exit 0
fi

response="$(curl --silent --show-error --fail-with-body --max-time 120 --retry 2 --retry-delay 5 \
  -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  "$ENDPOINT")"
echo "[send-notification-emails] Response: $response"
echo "[send-notification-emails] DONE $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
