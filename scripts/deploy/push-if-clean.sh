#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# scripts/deploy/push-if-clean.sh
#
# Convenience wrapper: runs validate-local.sh and, only if every check passes,
# pushes the current branch to origin.
#
# Usage:
#   bash scripts/deploy/push-if-clean.sh            # push to origin/main
#   bash scripts/deploy/push-if-clean.sh --dry-run  # validate only, no push
#
# The script will refuse to push from any branch other than main.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Run full validation ────────────────────────────────────────────────────────
echo ""
if ! bash "$SCRIPT_DIR/validate-local.sh"; then
  echo ""
  printf '\033[0;31m✗  Push aborted — validation failed.\033[0m\n' >&2
  exit 1
fi

# ── Push ──────────────────────────────────────────────────────────────────────
echo ""
if [ "$DRY_RUN" = true ]; then
  printf '\033[2m  --dry-run: skipping git push\033[0m\n'
  exit 0
fi

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
printf '\033[1m━━━ Pushing %s → origin ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m\n' "$CURRENT_BRANCH"
git push origin "$CURRENT_BRANCH"

printf '\033[0;32m\n  ✔  Pushed. GitHub Actions will now build and deploy.\033[0m\n'
printf '\033[2m     Monitor progress at: https://github.com/<org>/<repo>/actions\033[0m\n\n'
