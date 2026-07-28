#!/usr/bin/env bash
set -euo pipefail
exec "$(dirname "$0")/run-growth-agent.sh" "cfo-reporting"
