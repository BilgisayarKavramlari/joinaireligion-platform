#!/usr/bin/env bash
# scripts/ops/openclaw-run-email-status.sh
#
# OpenClaw — email delivery status probe.
#
# Calls POST /api/cron/send-practice-emails?mode=DRY_RUN which renders
# emails and returns a preview payload without sending anything or mutating
# any database records.  Reports how many messages are queued and their
# preview subjects.
#
# Also queries /api/admin/autonomy/health for the agent_email_last_run
# finding so the caller has a complete picture.
#
# Safe to run repeatedly (DRY_RUN makes zero mutations).
#
# Output (stdout, JSON):
#   {
#     "lastRun": { "level": "ok"|"warning"|"critical", "message": "..." },
#     "preview": { "ok": true, "mode": "DRY_RUN", "queued": N, "previews": [...] }
#   }
#
# Exit codes:
#   0  — success
#   1  — configuration error
#   2  — curl failure
#
# Secret safety: CRON_SECRET is never printed.
#
# Usage:
#   scripts/ops/openclaw-run-email-status.sh
#   DRY_RUN=1 scripts/ops/openclaw-run-email-status.sh

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

HEALTH_ENDPOINT="${APP_URL%/}/api/admin/autonomy/health"
EMAIL_ENDPOINT="${APP_URL%/}/api/cron/send-practice-emails?mode=DRY_RUN"

if [[ "${DRY_RUN:-0}" == "1" ]]; then
  echo '{"dryRun":true,"healthEndpoint":"'"$HEALTH_ENDPOINT"'","emailEndpoint":"'"$EMAIL_ENDPOINT"'"}'
  exit 0
fi

# ── Fetch last-run finding from health report ──────────────────────────────────
HEALTH_RESPONSE="$(
  curl --silent --show-error --max-time 30 \
    -H "Authorization: Bearer ${CRON_SECRET}" \
    "$HEALTH_ENDPOINT" 2>&1
)" || HEALTH_RESPONSE='{"findings":[]}'

LAST_RUN_FINDING="$(python3 -c "
import sys, json
try:
    d = json.loads(sys.stdin.read())
    finding = next(
        (f for f in d.get('findings', []) if f.get('key') == 'agent_email_last_run'),
        {'key': 'agent_email_last_run', 'level': 'unknown', 'message': 'health check unavailable'}
    )
    print(json.dumps(finding))
except:
    print(json.dumps({'key': 'agent_email_last_run', 'level': 'unknown', 'message': 'parse error'}))
" <<< "$HEALTH_RESPONSE")"

# ── Dry-run email delivery to count queued messages ───────────────────────────
PREVIEW_RESPONSE="$(
  curl --silent --show-error --max-time 60 \
    -X POST \
    -H "Authorization: Bearer ${CRON_SECRET}" \
    -H "Content-Type: application/json" \
    "$EMAIL_ENDPOINT" 2>&1
)" || PREVIEW_RESPONSE='{"ok":false,"error":"curl failed"}'

# ── Compose output ─────────────────────────────────────────────────────────────
python3 -c "
import sys, json
last_run = json.loads(sys.argv[1])
preview  = json.loads(sys.argv[2])
print(json.dumps({'lastRun': last_run, 'preview': preview}, indent=2))
" "$LAST_RUN_FINDING" "$PREVIEW_RESPONSE"

exit 0
