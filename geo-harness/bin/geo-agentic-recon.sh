#!/usr/bin/env bash
# geo-agentic-recon.sh — Layer 2. Inventory the agentic-commerce surfaces.
# llms.txt / llms-full.txt / agents.md / .well-known/ucp / sitemaps / robots.txt.
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib/common.sh"
require_var TARGET_WWW

out="$GEO_OUT/agentic-recon.txt"
fetch() { curl -sS -A "$UA_BROWSER" --max-time 25 "$1"; }
status() { curl -sS -A "$UA_BROWSER" -o /dev/null -w "%{http_code} %{size_download}b" --max-time 25 "$1"; }

{
echo "=== Agentic surfaces — $TARGET_WWW ==="
echo ""
echo "-- discovery files (status | size) --"
for f in llms.txt llms-full.txt agents.md .well-known/ucp sitemap_agentic_discovery.xml; do
  printf "  /%-28s %s\n" "$f" "$(status "$TARGET_WWW/$f")"
done
echo ""
echo "-- llms.txt: protocol-template vs content-map? (first 12 lines) --"
fetch "$TARGET_WWW/llms.txt" | head -12 | sed 's/^/    /'
echo "    [heuristic: lots of UCP/checkout/'how to transact' = protocol template (weak for citation);"
echo "     lists of pages/collections w/ descriptions = content map (strong for AI search).]"
echo ""
echo "-- .well-known/ucp summary --"
fetch "$TARGET_WWW/.well-known/ucp" | python3 -c "
import json,sys
try:
    u=json.load(sys.stdin).get('ucp',{})
    print('    version:',u.get('version'))
    print('    capabilities:',', '.join(sorted(u.get('capabilities',{}).keys())) or '(none)')
    print('    payment_handlers:',', '.join(u.get('payment_handlers',{}).keys()) or '(none)')
except Exception as e:
    print('    (no valid UCP JSON — likely not UCP-enabled or SPA fallback)')
"
echo ""
echo "-- sitemap inventory --"
subs=$(fetch "$TARGET_WWW/sitemap.xml" | grep -oE 'https://[^<]+\.xml[^<]*' | sed 's/&amp;/\&/g')
if [ -z "$subs" ]; then
  n=$(fetch "$TARGET_WWW/sitemap.xml" | grep -oE '<loc>' | wc -l | tr -d ' ')
  echo "    flat sitemap: $n <loc> entries"
else
  total=0
  while read -r s; do
    [ -z "$s" ] && continue
    label=$(echo "$s" | grep -oE 'sitemap[_-][a-z0-9_]+' | head -1)
    nn=$(fetch "$s" | grep -oE '<loc>' | wc -l | tr -d ' ')
    printf "    %-26s %s <loc>\n" "${label:-sub}" "$nn"
    total=$((total+nn))
  done <<< "$subs"
  echo "    ------------------------------"
  echo "    TOTAL <loc> across sub-sitemaps: $total"
fi
echo ""
echo "-- robots.txt: AI-bot directives + sitemap line --"
rob=$(fetch "$TARGET_WWW/robots.txt")
echo "$rob" | grep -iE 'gptbot|claudebot|claude-web|perplexity|oai-search|chatgpt-user|anthropic|google-extended|applebot|bytespider|amazonbot|ccbot|cohere|firecrawl' | sed 's/^/    /' || true
[ -z "$(echo "$rob" | grep -iE 'gptbot|claudebot|perplexity|ccbot|google-extended')" ] && echo "    (no AI-bot-specific directives — all under User-agent: *)"
echo "$rob" | grep -i '^sitemap:' | sed 's/^/    /'
} | tee "$out"
echo "-> $out"
