#!/usr/bin/env bash
# scripts/cron/autonomy-health.sh
#
# OpenClaw daily health probe.  Calls GET /api/admin/autonomy/health and
# logs the structured JSON result.  If status is WARNING or CRITICAL,
# logs all non-OK findings to stderr for alerting.
#
# Required environment variables (loaded from /etc/joinaireligion/cron.env):
#   APP_URL      — base URL, e.g. https://joinaireligion.com
#   CRON_SECRET  — shared secret for Bearer-token auth
#
# Optional:
#   ALERT_EMAIL  — address to notify when status is CRITICAL
#   DRY_RUN=1    — print the curl command without executing
#
# Typical crontab entry (run at 07:30 UTC, after email delivery):
#   30 7 * * * /opt/joinaireligion/scripts/cron/autonomy-health.sh >> /var/log/joinaireligion/autonomy.log 2>&1
#
# Exit codes:
#   0  — status OK or WARNING (system is operational, repair may be needed)
#   1  — configuration error
#   2  — status CRITICAL or curl failure

set -euo pipefail

ENV_FILE="${JOINAI_ENV_FILE:-/etc/joinaireligion/cron.env}"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

APP_URL="${APP_URL:-}"
CRON_SECRET="${CRON_SECRET:-}"
ALERT_EMAIL="${ALERT_EMAIL:-}"

if [[ -z "$APP_URL" ]]; then
  echo "[autonomy-health] ERROR: APP_URL is not set." >&2; exit 1
fi
if [[ -z "$CRON_SECRET" ]]; then
  echo "[autonomy-health] ERROR: CRON_SECRET is not set." >&2; exit 1
fi

ENDPOINT="${APP_URL%/}/api/admin/autonomy/health"
TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

echo "[autonomy-health] START $TIMESTAMP"
echo "[autonomy-health] Endpoint: $ENDPOINT"

if [[ "${DRY_RUN:-0}" == "1" ]]; then
  echo "[autonomy-health] DRY_RUN — would execute:"
  echo "  curl --silent --show-error --max-time 30 -H 'Authorization: Bearer ***' '$ENDPOINT'"
  exit 0
fi

RESPONSE="$(
  curl \
    --silent \
    --show-error \
    --max-time 30 \
    --retry 1 \
    -H "Authorization: Bearer ${CRON_SECRET}" \
    "$ENDPOINT" 2>&1
)"
CURL_EXIT=$?

if [[ $CURL_EXIT -ne 0 ]]; then
  echo "[autonomy-health] FAIL $TIMESTAMP — curl error (exit $CURL_EXIT): $RESPONSE" >&2
  exit 2
fi

echo "[autonomy-health] Response: $RESPONSE"

# Extract status field with Python (no jq dependency required)
STATUS="$(python3 -c "
import sys, json
try:
    d = json.loads(sys.stdin.read())
    print(d.get('status','UNKNOWN'))
except:
    print('PARSE_ERROR')
" <<< "$RESPONSE")"

echo "[autonomy-health] Status: $STATUS"

if [[ "$STATUS" == "CRITICAL" ]]; then
  echo "[autonomy-health] CRITICAL status detected — escalate to operations team." >&2
  if [[ -n "$ALERT_EMAIL" ]] && command -v sendmail &>/dev/null; then
    printf "Subject: [joinaireligion] Autonomy health CRITICAL\nFrom: cron@localhost\n\n%s\n" \
      "$RESPONSE" | sendmail "$ALERT_EMAIL"
  fi
  echo "[autonomy-health] DONE $TIMESTAMP"
  exit 2
fi

if [[ "$STATUS" == "WARNING" ]]; then
  echo "[autonomy-health] WARNING status — autonomy-repair.sh should follow." >&2
fi

echo "[autonomy-health] DONE $TIMESTAMP"
exit 0
