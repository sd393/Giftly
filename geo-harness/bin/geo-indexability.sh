#!/usr/bin/env bash
# geo-indexability.sh — Layer 1 trap. For each page, determine whether it is actively
# INDEXED (not just crawlable): meta robots, X-Robots-Tag, canonical, sitemap presence.
# Run this on deprecated/legacy/superseded pages that may leak outdated claims.
# Usage: bin/geo-indexability.sh [/path ...]   (defaults to WATCH_PAGES from config)
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib/common.sh"
require_var TARGET_WWW

PAGES=("$@"); [ "${#PAGES[@]}" -eq 0 ] && PAGES=("${WATCH_PAGES[@]:-}")
out="$GEO_OUT/indexability.txt"

# Pre-fetch all sitemap <loc> URLs once for membership checks.
SUBS=$(curl -sS -A "$UA_BROWSER" --max-time 25 "$TARGET_WWW/sitemap.xml" | grep -oE 'https://[^<]+\.xml[^<]*' | sed 's/&amp;/\&/g')
ALLLOCS=$(mktemp)
if [ -n "$SUBS" ]; then
  while read -r s; do [ -n "$s" ] && curl -sS -A "$UA_BROWSER" --max-time 25 "$s"; done <<< "$SUBS" > "$ALLLOCS"
else
  curl -sS -A "$UA_BROWSER" --max-time 25 "$TARGET_WWW/sitemap.xml" > "$ALLLOCS"
fi

{
echo "=== Indexability trap — $TARGET_WWW ==="
for p in "${PAGES[@]}"; do
  [ -z "$p" ] && continue
  url="$TARGET_WWW$p"
  html=$(curl -sS -A "$UA_BROWSER" --max-time 25 "$url")
  metarobots=$(echo "$html" | grep -ioE '<meta[^>]*(robots|googlebot)[^>]*>' | head -2 | tr -d '\r')
  xrobots=$(curl -sS -A "$UA_BROWSER" -I --max-time 25 "$url" | grep -i '^x-robots-tag:' | tr -d '\r')
  canon=$(echo "$html" | grep -ioE '<link[^>]*rel=["'"'"']?canonical[^>]*>' | head -1 | tr -d '\r')
  insitemap=$(grep -c "$p" "$ALLLOCS")
  echo ""
  echo "-- $p --"
  echo "  meta robots:   ${metarobots:-<none> (= indexable)}"
  echo "  X-Robots-Tag:  ${xrobots:-<none> (= not blocked at header level)}"
  echo "  canonical:     ${canon:-<none>}"
  echo "  in sitemap:    $([ "$insitemap" -gt 0 ] && echo "YES ($insitemap match) — actively submitted to Google" || echo "no")"
  if [ -z "$metarobots" ] && [ -z "$xrobots" ] && [ "$insitemap" -gt 0 ]; then
    echo "  VERDICT: ACTIVELY INDEXED. If this page is deprecated/superseded, it will be ingested"
    echo "           and quoted by AI engines. Fix = add noindex (+ drop from sitemap)."
  fi
done
} | tee "$out"
rm -f "$ALLLOCS"
echo "-> $out"
