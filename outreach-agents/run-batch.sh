#!/usr/bin/env bash
# One-shot agent-outreach batch runner: scrape -> [find] -> send -> bounce-sweep.
# Prints only per-step summaries to stdout; per-row detail lands in ./logs/.
#
# Usage: ./run-batch.sh <batch.csv> <account-email> [--dry-run] [--find-emails]
# Env:   GOG_KEYRING_PASSWORD must be set.
#        ANTHROPIC_API_KEY must be set when --find-emails is used.
#
# --find-emails inserts a personal-email upgrade pass between scrape and
# send. It rewrites <batch.csv> in place (with a .bak first) using web
# search + SMTP probing.
#
# Forked from outreach/run-batch.sh — same orchestration, separate dir so
# the agent campaign and the brand campaign never share scripts or logs.

set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "usage: $0 <batch.csv> <account-email> [--dry-run] [--find-emails]" >&2
  exit 1
fi

BATCH="$1"
ACCOUNT="$2"
shift 2
DRY=""
FIND=""
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY="--dry-run" ;;
    --find-emails) FIND="1" ;;
  esac
done

if [[ -z "${GOG_KEYRING_PASSWORD:-}" ]]; then
  echo "ERROR: GOG_KEYRING_PASSWORD not set" >&2
  exit 1
fi
if [[ -n "$FIND" && -z "${ANTHROPIC_API_KEY:-}" ]]; then
  echo "ERROR: ANTHROPIC_API_KEY not set (required for --find-emails)" >&2
  exit 1
fi

HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"

# find-emails.py needs anthropic + dnspython. Homebrew Python blocks global
# installs (PEP 668), so we keep them in a venv at .venv/. Prefer it when
# present; fall back to system python3 otherwise (which will ImportError
# loudly — that's the signal to run `python3 -m venv .venv && ...`).
FIND_PY="python3"
if [[ -x "$HERE/.venv/bin/python3" ]]; then
  FIND_PY="$HERE/.venv/bin/python3"
fi

echo -n "[scrape] "
python3 scrape-batch.py "$BATCH"
echo

if [[ -n "$FIND" ]]; then
  echo -n "[find]   "
  "$FIND_PY" find-emails.py "$BATCH" ${DRY}
  echo
fi

echo -n "[send]   "
GOG_ACCOUNT="$ACCOUNT" python3 send-batch.py "$BATCH" ${DRY}
echo

echo -n "[bounce] "
python3 process-bounces.py --account "$ACCOUNT" --since 30m ${DRY}
