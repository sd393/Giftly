#!/usr/bin/env bash
# geo-bot-access.sh — Layer 1. Probe AI-crawler accessibility across the key URLs.
# Requests each URL with the four major AI-crawler UAs; flags blocking / cloaking.
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib/common.sh"
require_var TARGET_WWW

PATHS=("/" "${CATEGORY_PATH:-}" "${HERO_PRODUCT_PATH:-}" "${POLICY_PATHS[@]:-}")
declare -A UAS=( [GPTBot]="$UA_GPTBOT" [ClaudeBot]="$UA_CLAUDEBOT" [PerplexityBot]="$UA_PERPLEXITY" [OAI-SearchBot]="$UA_OAISEARCH" )
ORDER=(GPTBot ClaudeBot PerplexityBot OAI-SearchBot)

out="$GEO_OUT/bot-access.txt"
{
echo "=== AI crawler accessibility — $TARGET_WWW ==="
printf "%-34s %-15s %-7s %-8s %s\n" "PATH" "BOT" "STATUS" "TIME" "NOTES"
for p in "${PATHS[@]}"; do
  [ -z "$p" ] && continue
  url="$TARGET_WWW$p"
  # control: a normal browser, to detect bot-specific blocking / size cloaking
  bsize=$(curl -sS -A "$UA_BROWSER" -o /dev/null -w "%{size_download}" "$url" 2>/dev/null)
  for b in "${ORDER[@]}"; do
    hdr=$(mktemp)
    read -r code t < <(curl -sS -A "${UAS[$b]}" -o /dev/null -D "$hdr" -w "%{http_code} %{time_total}" -I "$url" 2>/dev/null)
    xr=$(grep -i '^x-robots-tag:' "$hdr" | head -1 | tr -d '\r')
    cf=$(grep -i '^cf-mitigated:' "$hdr" | head -1 | tr -d '\r')
    ra=$(grep -i '^retry-after:' "$hdr" | head -1 | tr -d '\r')
    notes="$xr $cf $ra"; [ -z "$(echo "$notes" | tr -d ' ')" ] && notes="(none)"
    printf "%-34s %-15s %-7s %-8s %s\n" "$p" "$b" "$code" "$t" "$notes"
    rm -f "$hdr"
  done
  echo "    (browser GET body size for $p: ${bsize}b — compare vs bot GET to detect cloaking)"
done
echo ""
echo "READ: 200 across all bots + no cf-mitigated/x-robots/retry-after = open. Investigate any"
echo "non-200, any bot/browser size mismatch (cloaking), or any 403/429 (blocking)."
} | tee "$out"
echo "-> $out"
