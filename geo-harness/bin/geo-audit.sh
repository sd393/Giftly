#!/usr/bin/env bash
# geo-audit.sh — run every no-auth probe (layers 1-3 + reputation discovery prep) in sequence.
# Browser probes (geo-serp, geo-prompts) are NOT included — run those manually (need headed
# Chromium + a logged-in ChatGPT session). See METHODOLOGY.md.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$(cd "$HERE/.." && pwd)/lib/common.sh"
require_var TARGET_WWW
require_var BRAND_NAME

echo "############################################################"
echo "# GEO no-auth audit: $BRAND_NAME ($TARGET_WWW)"
echo "# output dir: $GEO_OUT"
echo "############################################################"

run() { echo ""; echo ">>> $1"; shift; "$@" >/dev/null 2>&1 && echo "    ok" || echo "    (probe reported a non-zero exit — check its .txt)"; }

run "geo-bot-access"          "$HERE/geo-bot-access.sh"
run "geo-agentic-recon"       "$HERE/geo-agentic-recon.sh"
run "geo-mcp-probe"           "$HERE/geo-mcp-probe.sh"
run "geo-product-json"        "$HERE/geo-product-json.sh"
run "geo-indexability"        "$HERE/geo-indexability.sh"
run "geo-entity-check"        "$HERE/geo-entity-check.sh"
[ -n "${HERO_PRODUCT_PATH:-}" ] && { echo ""; echo ">>> geo-schema-audit"; python3 "$HERE/geo-schema-audit.py" "$TARGET_WWW$HERO_PRODUCT_PATH" > "$GEO_OUT/schema-audit.txt" 2>&1 && echo "    ok -> $GEO_OUT/schema-audit.txt"; }

echo ""
echo "############################################################"
echo "# Done. Results in $GEO_OUT/ :"
ls -1 "$GEO_OUT" | sed 's/^/#   /'
echo "#"
echo "# Next (manual, headed browser): bin/geo-serp.sh, then bin/geo-reddit.sh on"
echo "# discovered threads, then bin/geo-prompts.sh for the ChatGPT prompt-set."
echo "############################################################"
