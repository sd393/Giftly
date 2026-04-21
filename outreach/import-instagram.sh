#!/usr/bin/env bash
# One-shot IG DM import: parse both Meta "Download Your Information" ZIPs into
# CSVs and upload the outbound DMs to the Giftly platform.
#
# Parses the @trygiftly export without keyword filter (whole account is
# outreach) and the personal export with the default Giftly-keyword filter.
# Upload step is idempotent via external_id — safe to re-run on the same ZIPs.
#
# Usage:
#   ./import-instagram.sh <giftly-zip> [<ethan-zip>]
#
# Env:
#   GIFTLY_API_URL + GIFTLY_API_TOKEN must be set (or in ../.env.local, which
#   outreach/giftly_api.py autoloads).

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <giftly-zip> [<ethan-zip>]" >&2
  exit 1
fi

HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"

PY=python3
for candidate in python3.14 python3.13 python3.12 python3.11 python3.10; do
  if command -v "$candidate" >/dev/null 2>&1; then
    PY="$candidate"
    break
  fi
done

GIFTLY_ZIP="$1"
ETHAN_ZIP="${2:-}"

echo "[parse] Giftly account (no keyword filter)"
"$PY" parse-instagram-export.py "$GIFTLY_ZIP" \
  --self-name "Giftly" \
  --no-keyword-filter \
  --out instagram-dms-giftly.csv

if [[ -n "$ETHAN_ZIP" ]]; then
  echo "[parse] Ethan personal account (Giftly keyword filter)"
  "$PY" parse-instagram-export.py "$ETHAN_ZIP" \
    --self-name "Ethan Zhou" \
    --out instagram-dms-ethan.csv
else
  # No personal export this run — wipe stale CSV so uploader doesn't re-read it.
  rm -f instagram-dms-ethan.csv
fi

echo "[upload] to platform (dedup by external_id)"
"$PY" upload-instagram-dms.py
