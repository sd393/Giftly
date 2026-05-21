#!/usr/bin/env bash
# One-shot mid-size-retailer batch runner: send -> bounce-sweep.
# Prints only per-step summaries to stdout; per-row detail lands in ./logs/.
#
# Usage: ./run-batch.sh <batch.csv> <account-email> [--dry-run]
# Env:   GOG_KEYRING_PASSWORD must be set.
#
# No scrape stage — input emails are provided manually by the campaign
# owner and trusted as-is. Sender dedupes against outreach-log.csv by
# email.
#
# Forked from outreach-brands-audit/run-batch.sh — same orchestration
# shape, different pitch (multi-brand retailers / marketplaces instead
# of single-brand DTC), separate dir so this campaign never shares
# scripts or logs with the brand-audit, Throne, agent, or creator
# campaigns.

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
  case "$arg" in
    --dry-run) DRY="--dry-run" ;;
  esac
done

if [[ -z "${GOG_KEYRING_PASSWORD:-}" && -z "$DRY" ]]; then
  echo "ERROR: GOG_KEYRING_PASSWORD not set" >&2
  exit 1
fi

HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"

echo -n "[send]   "
GOG_ACCOUNT="$ACCOUNT" python3 send-batch.py "$BATCH" ${DRY}
echo

echo -n "[bounce] "
python3 process-bounces.py --account "$ACCOUNT" --since 30m ${DRY}
