#!/usr/bin/env bash
set -euo pipefail

AGENT_NAME="${1:-}"
case "$AGENT_NAME" in
  seo-kulliyat-draft|content-locale-backfill|content-publisher|content-performance|podcast-publisher|social-listener|social-listener-draft|social-publisher|ads-reporting|cfo-reporting|revenue-orchestrator|private-note-retention) ;;
  *) echo "[growth-agent] ERROR: unsupported agent name." >&2; exit 1 ;;
esac

ENV_FILE="${JOINAI_ENV_FILE:-/etc/joinaireligion/cron.env}"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

APP_URL="${APP_URL:-}"
CRON_SECRET="${CRON_SECRET:-}"
if [[ -z "$APP_URL" || -z "$CRON_SECRET" ]]; then
  echo "[$AGENT_NAME] ERROR: APP_URL and CRON_SECRET are required." >&2
  exit 1
fi

ENDPOINT="${APP_URL%/}/api/cron/${AGENT_NAME}"
echo "[$AGENT_NAME] START $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

if [[ "${DRY_RUN:-0}" == "1" ]]; then
  echo "[$AGENT_NAME] DRY_RUN — POST $ENDPOINT with redacted Bearer token"
  exit 0
fi

response="$(curl --silent --show-error --fail-with-body --max-time 300 --retry 1 --retry-delay 3 \
  -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  "$ENDPOINT")"
echo "[$AGENT_NAME] Response: $response"
echo "[$AGENT_NAME] DONE $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
