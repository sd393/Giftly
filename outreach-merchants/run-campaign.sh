#!/usr/bin/env bash
# Hands-off pipeline runner for outreach-merchants.
# Chains: source -> discover -> verify -> send -> bounce-sweep.
#
# Usage: ./run-campaign.sh <account-email> [--dry-run] [--skip-source] [--skip-discover]
# Env:   GOG_KEYRING_PASSWORD must be set for the send stage.
#        HUNTER_API_KEY is read from outreach-merchants/.env automatically.
#
# Idempotent stages: --skip-source / --skip-discover allow resuming
# from candidates.csv or contacts.csv when re-running.

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <account-email> [--dry-run] [--skip-source] [--skip-discover]" >&2
  exit 1
fi

ACCOUNT="$1"; shift
DRY=""
SKIP_SOURCE=""
SKIP_DISCOVER=""
for arg in "$@"; do
  case "$arg" in
    --dry-run)      DRY="--dry-run" ;;
    --skip-source)  SKIP_SOURCE="1" ;;
    --skip-discover) SKIP_DISCOVER="1" ;;
  esac
done

if [[ -z "${GOG_KEYRING_PASSWORD:-}" && -z "$DRY" ]]; then
  echo "ERROR: GOG_KEYRING_PASSWORD not set (send stage will fail)" >&2
  exit 1
fi

HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"

if [[ -z "$SKIP_SOURCE" ]]; then
  echo -n "[source]   "
  python3 source-publicwww.py
  echo
fi

if [[ -z "$SKIP_DISCOVER" ]]; then
  echo "[discover] (running, may take a few minutes)"
  python3 discover-contacts.py
  echo
fi

echo "[verify]   (running)"
python3 verify-emails.py
echo

echo -n "[send]     "
GOG_ACCOUNT="$ACCOUNT" python3 send-batch.py verified.csv ${DRY}
echo

echo -n "[bounce]   "
python3 process-bounces.py --account "$ACCOUNT" --since 30m ${DRY}
