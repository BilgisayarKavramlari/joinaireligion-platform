#!/usr/bin/env bash
# scripts/cron/autonomy-repair.sh
#
# OpenClaw safe autonomous repair.  Calls POST /api/cron/autonomy-repair
# which applies only non-destructive data corrections:
#   - Create missing UserJourneyState rows
#   - Requeue FAILED practice messages whose generation succeeded
#   - Requeue messages stuck in QUEUED > 48h
#   - Score unscored PracticeResponse records and award XP
#   - Regenerate missing practice messages for eligible users
#
# This script is safe to run unconditionally — the endpoint is fully
# idempotent.  It is intended to run after autonomy-health.sh confirms
# a WARNING or CRITICAL status, but may also run on a fixed schedule.
#
# Required environment variables (loaded from /etc/joinaireligion/cron.env):
#   APP_URL      — base URL, e.g. https://joinaireligion.com
#   CRON_SECRET  — shared secret for Bearer-token auth
#
# Optional:
#   DRY_RUN=1    — print the curl command without executing
#
# Typical crontab entry (run at 07:35 UTC, 5 min after health probe):
#   35 7 * * * /opt/joinaireligion/scripts/cron/autonomy-repair.sh >> /var/log/joinaireligion/autonomy.log 2>&1
#
# Exit codes:
#   0  — repair completed (check totalFixed in output for details)
#   1  — configuration error
#   2  — HTTP or curl failure

set -euo pipefail

ENV_FILE="${JOINAI_ENV_FILE:-/etc/joinaireligion/cron.env}"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

APP_URL="${APP_URL:-}"
CRON_SECRET="${CRON_SECRET:-}"

if [[ -z "$APP_URL" ]]; then
  echo "[autonomy-repair] ERROR: APP_URL is not set." >&2; exit 1
fi
if [[ -z "$CRON_SECRET" ]]; then
  echo "[autonomy-repair] ERROR: CRON_SECRET is not set." >&2; exit 1
fi

ENDPOINT="${APP_URL%/}/api/cron/autonomy-repair"
TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

echo "[autonomy-repair] START $TIMESTAMP"
echo "[autonomy-repair] Endpoint: $ENDPOINT"

if [[ "${DRY_RUN:-0}" == "1" ]]; then
  echo "[autonomy-repair] DRY_RUN — would execute:"
  echo "  curl --silent --show-error --fail-with-body --max-time 120 --retry 2 \\"
  echo "    -X POST -H 'Authorization: Bearer ***' '$ENDPOINT'"
  exit 0
fi

RESPONSE="$(
  curl \
    --silent \
    --show-error \
    --fail-with-body \
    --max-time 120 \
    --retry 2 \
    --retry-delay 5 \
    -X POST \
    -H "Authorization: Bearer ${CRON_SECRET}" \
    -H "Content-Type: application/json" \
    "$ENDPOINT" 2>&1
)"
CURL_EXIT=$?

echo "[autonomy-repair] Response: $RESPONSE"

if [[ $CURL_EXIT -ne 0 ]]; then
  echo "[autonomy-repair] FAILED (curl exit $CURL_EXIT)" >&2
  exit 2
fi

# Log summary
TOTAL_FIXED="$(python3 -c "
import sys, json
try:
    d = json.loads(sys.stdin.read())
    print(d.get('totalFixed', '?'))
except:
    print('?')
" <<< "$RESPONSE")"

echo "[autonomy-repair] Total fixed: $TOTAL_FIXED"
echo "[autonomy-repair] DONE $TIMESTAMP"
exit 0
