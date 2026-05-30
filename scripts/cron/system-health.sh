#!/usr/bin/env bash
# scripts/cron/system-health.sh
#
# Lightweight health probe for the JoinAI Religion application.
# Checks the public /api/health endpoint and verifies the response body
# contains { "ok": true }.  Logs result to stdout (suitable for cron.log).
# Sends an alert email via the system MTA if the check fails.
#
# Required environment variables (loaded from /etc/joinaireligion/cron.env):
#   APP_URL          — base URL, e.g. https://joinaireligion.com
#
# Optional:
#   ALERT_EMAIL      — address to notify on failure (requires sendmail/postfix)
#   HEALTH_PATH      — path to check (default: /api/health)
#   DRY_RUN=1        — print the curl command without executing it
#
# Typical crontab entry (run every 5 minutes):
#   */5 * * * * /opt/joinaireligion/scripts/cron/system-health.sh >> /var/log/joinaireligion/health.log 2>&1
#
# Exit codes:
#   0  — application is healthy
#   1  — configuration error
#   2  — health check failed

set -euo pipefail

# ── Load environment ──────────────────────────────────────────────────────────
ENV_FILE="${JOINAI_ENV_FILE:-/etc/joinaireligion/cron.env}"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

APP_URL="${APP_URL:-}"
ALERT_EMAIL="${ALERT_EMAIL:-}"
HEALTH_PATH="${HEALTH_PATH:-/api/health}"

if [[ -z "$APP_URL" ]]; then
  echo "[system-health] ERROR: APP_URL is not set." >&2
  exit 1
fi

ENDPOINT="${APP_URL%/}${HEALTH_PATH}"
TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# ── Dry-run mode ──────────────────────────────────────────────────────────────
if [[ "${DRY_RUN:-0}" == "1" ]]; then
  echo "[system-health] DRY_RUN — would execute:"
  echo "  curl --silent --show-error --max-time 10 --write-out '%{http_code}' '${ENDPOINT}'"
  exit 0
fi

# ── Execute ───────────────────────────────────────────────────────────────────
HTTP_BODY="$(
  curl \
    --silent \
    --show-error \
    --max-time 10 \
    --retry 1 \
    "$ENDPOINT" \
    2>&1
)"
CURL_EXIT=$?

if [[ $CURL_EXIT -ne 0 ]]; then
  echo "[system-health] FAIL $TIMESTAMP — curl error (exit $CURL_EXIT): $HTTP_BODY"
  if [[ -n "$ALERT_EMAIL" ]] && command -v sendmail &>/dev/null; then
    printf "Subject: [joinaireligion] Health check FAILED\nFrom: cron@localhost\n\ncurl failed (exit %s):\n%s\n" \
      "$CURL_EXIT" "$HTTP_BODY" \
      | sendmail "$ALERT_EMAIL"
  fi
  exit 2
fi

# Verify "ok":true in the JSON body (simple grep, no jq required)
if echo "$HTTP_BODY" | grep -q '"ok"\s*:\s*true'; then
  echo "[system-health] OK $TIMESTAMP — $HTTP_BODY"
  exit 0
else
  echo "[system-health] FAIL $TIMESTAMP — unexpected body: $HTTP_BODY"
  if [[ -n "$ALERT_EMAIL" ]] && command -v sendmail &>/dev/null; then
    printf "Subject: [joinaireligion] Health check FAILED\nFrom: cron@localhost\n\nUnexpected response:\n%s\n" \
      "$HTTP_BODY" \
      | sendmail "$ALERT_EMAIL"
  fi
  exit 2
fi
