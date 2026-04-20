#!/usr/bin/env bash
# One-shot outreach batch runner: scrape -> send -> bounce-sweep.
# Prints only per-step summaries to stdout; per-row detail lands in ./logs/.
#
# Usage: ./run-batch.sh <batch.csv> <account-email> [--dry-run]
# Env:   GOG_KEYRING_PASSWORD must be set.

set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "usage: $0 <batch.csv> <account-email> [--dry-run]" >&2
  exit 1
fi

BATCH="$1"
ACCOUNT="$2"
shift 2
DRY=""
for arg in "$@"; do
  [[ "$arg" == "--dry-run" ]] && DRY="--dry-run"
done

if [[ -z "${GOG_KEYRING_PASSWORD:-}" ]]; then
  echo "ERROR: GOG_KEYRING_PASSWORD not set" >&2
  exit 1
fi

HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"

echo -n "[scrape] "
python3 scrape-batch.py "$BATCH"
echo

echo -n "[send]   "
GOG_ACCOUNT="$ACCOUNT" python3 send-batch.py "$BATCH" ${DRY}
echo

echo -n "[bounce] "
python3 process-bounces.py --account "$ACCOUNT" --since 30m ${DRY}
