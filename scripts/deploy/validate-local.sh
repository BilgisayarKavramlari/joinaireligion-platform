#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# scripts/deploy/validate-local.sh
#
# Run this before pushing to main to catch problems locally before CI does.
#
# Checks:
#   1. Working tree is clean (no uncommitted changes)
#   2. Current branch is main
#   3. .env and .env.local are not staged or tracked
#   4. Prisma client can be generated from current schema
#   5. npm run build passes
#
# Usage:
#   bash scripts/deploy/validate-local.sh
#
# Exit codes:
#   0 — all checks passed
#   1 — one or more checks failed (details printed to stderr)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

PASS=0
FAIL=1
overall=0

# Colour helpers (gracefully degrade if terminal doesn't support them)
green() { printf '\033[0;32m%s\033[0m\n' "$*"; }
red()   { printf '\033[0;31m%s\033[0m\n' "$*" >&2; }
bold()  { printf '\033[1m%s\033[0m\n' "$*"; }
dim()   { printf '\033[2m%s\033[0m\n' "$*"; }

check_pass() { green "  ✔  $1"; }
check_fail() { red   "  ✗  $1"; overall=1; }

bold "━━━ joinaireligion — pre-push validation ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Ensure we are at the project root ──────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"
dim "  Project root: $PROJECT_ROOT"

# ── 2. Branch check ───────────────────────────────────────────────────────────
echo ""; bold "[1/5] Branch"
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" = "main" ]; then
  check_pass "On branch main"
else
  check_fail "Not on main (currently on '$CURRENT_BRANCH'). Switch with: git checkout main"
fi

# ── 3. Clean working tree ─────────────────────────────────────────────────────
echo ""; bold "[2/5] Working tree"
if [ -z "$(git status --porcelain)" ]; then
  check_pass "Working tree is clean"
else
  check_fail "Uncommitted or untracked changes detected. Commit or stash before pushing."
  git status --short
fi

# ── 4. .env files not tracked ─────────────────────────────────────────────────
echo ""; bold "[3/5] Secret files"
ENV_TRACKED=$(git ls-files .env .env.local .env.production 2>/dev/null || true)
if [ -z "$ENV_TRACKED" ]; then
  check_pass ".env files are not tracked by git"
else
  check_fail "The following secret files are tracked by git and must be removed:"
  echo "$ENV_TRACKED" >&2
  red "  Run: git rm --cached <file> && echo '<file>' >> .gitignore"
fi

# ── 5. Prisma generate ────────────────────────────────────────────────────────
echo ""; bold "[4/5] Prisma client generation"
if npx prisma generate > /tmp/joinaireligion_prisma_generate.log 2>&1; then
  check_pass "prisma generate succeeded"
else
  check_fail "prisma generate failed — schema may be invalid. Last 30 lines:"
  tail -30 /tmp/joinaireligion_prisma_generate.log >&2
fi

# ── 6. Build ───────────────────────────────────────────────────────────────────
echo ""; bold "[5/5] Next.js build"
dim "  (This may take 30–90 seconds)"
if npm run build > /tmp/joinaireligion_build.log 2>&1; then
  check_pass "npm run build succeeded"
else
  check_fail "npm run build FAILED. Last 30 lines of output:"
  tail -30 /tmp/joinaireligion_build.log >&2
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
bold "━━━ Result ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$overall" -eq 0 ]; then
  green "  All checks passed. Safe to push."
else
  red   "  One or more checks failed. Fix the issues above before pushing."
fi

exit "$overall"
