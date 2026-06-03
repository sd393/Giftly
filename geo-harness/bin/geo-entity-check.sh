#!/usr/bin/env bash
# geo-entity-check.sh — Layer 3. Wikipedia + Wikidata entity presence for the brand and
# competitors, via open APIs. No entity = nothing authoritative for AI to anchor to.
# Watch for NAME COLLISIONS (brand name == a common concept).
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib/common.sh"
require_var BRAND_NAME

out="$GEO_OUT/entity-check.txt"
NAMES=("$BRAND_NAME" "${COMPETITOR_NAMES[@]:-}")

wiki() { curl -sS -A "$UA_BROWSER" "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=$(urlenc "$1")&format=json&srlimit=3"; }
wd()  { curl -sS -A "$UA_BROWSER" "https://www.wikidata.org/w/api.php?action=wbsearchentities&search=$(urlenc "$1")&language=en&format=json&type=item&limit=4"; }

{
echo "=== Entity & disambiguation — Wikipedia + Wikidata ==="
for n in "${NAMES[@]}"; do
  [ -z "$n" ] && continue
  echo ""
  echo "############ $n ############"
  echo "-- Wikipedia top hits --"
  wiki "$n" | python3 -c "import json,sys;[print('   ',r['title'],'| words:',r['wordcount']) for r in json.load(sys.stdin).get('query',{}).get('search',[])]" 2>/dev/null || echo "   (error)"
  echo "-- Wikidata top hits (Q-id | label | description) --"
  wd "$n" | python3 -c "import json,sys;[print('   ',e['id'],'|',e.get('label'),'|',e.get('description','(no desc)')) for e in json.load(sys.stdin).get('search',[])]" 2>/dev/null || echo "   (error)"
done
echo ""
echo "READ: a brand WITHOUT a matching Wikipedia article or Wikidata company entity has no"
echo "authoritative anchor. If the top hits are a CONCEPT/other thing sharing the name, the"
echo "entity slot is occupied by the wrong thing (worst case for AI disambiguation)."
} | tee "$out"
echo "-> $out"
