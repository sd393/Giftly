#!/usr/bin/env bash
# geo-serp.sh — Layer 3/4. Capture branded SERPs (knowledge panel, disambiguation, organic mix)
# and listicle/Reddit discovery, using a HEADED Chromium (headless gets bot-blocked by Google).
#
# Requires gstack /browse. Launches a visible window. See METHODOLOGY "Anti-bot reality".
# Usage: bin/geo-serp.sh ["query one" "query two" ...]
#   With no args, runs a default GEO query set built from BRAND_NAME.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$(cd "$HERE/.." && pwd)/lib/common.sh"
require_var BRAND_NAME
B="$(browse_bin)"; [ -n "$B" ] || { echo "ERROR: gstack browse not found. Install gstack /browse."; exit 1; }

shots="$GEO_OUT/serp_shots"; mkdir -p "$shots"
out="$GEO_OUT/serp.txt"; : > "$out"

if [ "$#" -ge 1 ]; then QUERIES=("$@"); else
  QUERIES=(
    "$BRAND_NAME"
    "$BRAND_NAME brand"
    "is $BRAND_NAME legit"
    "$BRAND_NAME vs ${COMPETITOR_NAMES[0]:-competitor}"
    "site:reddit.com $BRAND_NAME"
    "best ${CATEGORY_QUERY:-sustainable brands}"
  )
fi

echo "Launching headed Chromium. Do NOT click in the window while it runs." | tee -a "$out"
for q in "${QUERIES[@]}"; do
  enc=$(urlenc "$q"); slug=$(echo "$q" | tr ' .:/' '____' | cut -c1-40)
  $B --headed goto "https://www.google.com/search?q=$enc" >/dev/null 2>&1
  sleep 3
  {
  echo "################ QUERY: $q ################"
  $B --headed js "(document.body.innerText.match(/unusual traffic|verify you|not a robot|recaptcha/i)||['NO-BLOCK'])[0]" 2>/dev/null
  $B --headed eval "$HERE/../lib/serp_extract.js" 2>/dev/null
  echo ""
  } | tee -a "$out"
  $B --headed screenshot "$shots/serp_${slug}.png" >/dev/null 2>&1
done
echo "-> $out  (screenshots: $shots/)"
echo "Tip: for 'site:reddit.com' queries, copy the reddit.com thread hosts/paths from the"
echo "organic results and feed them to bin/geo-reddit.sh."
