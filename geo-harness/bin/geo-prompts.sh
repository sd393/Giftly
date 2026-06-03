#!/usr/bin/env bash
# geo-prompts.sh — Layer 4 keystone. Run the prompt set through a logged-in ChatGPT session,
# TWICE per prompt (Pass 1 = forced no-browse, Pass 2 = forced web search), and capture the
# verbatim answer + citations + a screenshot for each.
#
# PREREQS (see METHODOLOGY "Anti-bot reality"):
#   1. gstack /browse installed.
#   2. A logged-in ChatGPT session in the headed Chromium. Either:
#        a) log in manually in the window the first run opens, OR
#        b) import an existing browser's chatgpt.com cookies (Firefox: export
#           cookies.sqlite chatgpt.com rows to Playwright JSON, valid integer `expires`,
#           chatgpt.com-domain ONLY; then `browse --headed cookie-import <json>`).
#      Verify login by SCREENSHOT, not a DOM check (logged-out users also see the composer).
#
# Tokens in prompts/prompt-set.tsv are filled from config.sh:
#   {{BRAND}} {{COMPETITOR1}} {{COMPETITOR2}} {{CATEGORY}} {{PRODUCT}} {{PRODUCT2}}
#
# Usage: bin/geo-prompts.sh        (runs all 20 prompts x 2 passes = 40 captures)
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB="$(cd "$HERE/.." && pwd)/lib"
source "$LIB/common.sh"
require_var BRAND_NAME
B="$(browse_bin)"; [ -n "$B" ] || { echo "ERROR: gstack browse not found."; exit 1; }

BRAND="$BRAND_NAME"
C1="${COMPETITOR_NAMES[0]:-a competitor}"
C2="${COMPETITOR_NAMES[1]:-another competitor}"
CAT="${CATEGORY_QUERY:-sustainable household}"
PROD="${HERO_PRODUCT_NAME:-shampoo}"
PROD2="${SECOND_PRODUCT_NAME:-dish soap}"

fill() { sed -e "s/{{BRAND}}/$BRAND/g" -e "s/{{COMPETITOR1}}/$C1/g" -e "s/{{COMPETITOR2}}/$C2/g" \
             -e "s/{{CATEGORY}}/$CAT/g" -e "s/{{PRODUCT2}}/$PROD2/g" -e "s/{{PRODUCT}}/$PROD/g" <<< "$1"; }

shots="$GEO_OUT/prompt_shots"; mkdir -p "$shots"
TSV="$GEO_OUT/prompts-results.tsv"
RESP="$GEO_OUT/prompts-responses.txt"
: > "$RESP"
printf "id\tcategory\tpass\tbrand_mentioned\tsources_cited\texcerpt\tscreenshot\n" > "$TSV"

P1="Without searching the web or browsing, based only on what you already know, answer: "
P2="Search the web for current information, then answer: "

# verify a logged-in session
$B --headed goto "https://chatgpt.com/" >/dev/null 2>&1; sleep 3
$B --headed screenshot "$shots/_login_check.png" >/dev/null 2>&1
echo "Saved $shots/_login_check.png — confirm you are logged in (Plus) before trusting results."

run_one() {
  local id="$1" cat="$2" prompt="$3" pass="$4" prefix="$5"
  local full="${prefix}${prompt}" shot="$shots/${id}_p${pass}.png"
  $B --headed goto "https://chatgpt.com/" >/dev/null 2>&1; sleep 3
  $B --headed click "#prompt-textarea" >/dev/null 2>&1; sleep 0.4
  $B --headed type "$full" >/dev/null 2>&1; sleep 0.4
  $B --headed press Enter >/dev/null 2>&1
  local stable=0
  for _ in $(seq 1 48); do
    sleep 2
    local st; st=$($B --headed eval "$LIB/chatgpt_state.js" 2>/dev/null)
    if echo "$st" | grep -q '^DONE|[1-9]'; then stable=$((stable+1)); else stable=0; fi
    [ "$stable" -ge 2 ] && break
  done
  sleep 1
  $B --headed screenshot "$shot" >/dev/null 2>&1
  $B --headed eval "$LIB/chatgpt_resp.js" 2>/dev/null > /tmp/geo_resp.json
  python3 - "$id" "$cat" "$pass" "$shot" "$TSV" "$RESP" "$prompt" "$BRAND" /tmp/geo_resp.json <<'PYEOF'
import json,sys,re
id_,cat,pass_,shot,tsv,respf,prompt,brand,jf=sys.argv[1:10]
try: d=json.loads(open(jf,encoding='utf-8',errors='ignore').read(),strict=False)
except: d={"text":"","links":[]}
text=d.get("text","") or ""; links=d.get("links",[])
domains=sorted(set(re.sub(r'^https?://(www\.)?','',l).split('/')[0] for l in links if l.startswith('http')))
bm="Y" if brand.lower() in text.lower() else "N"
excerpt=re.sub(r'\s+',' ',text)[:800].replace('\t',' ')
open(tsv,'a').write("\t".join([id_,cat,pass_,bm,("; ".join(domains) or "-"),excerpt,shot.split('/')[-1]])+"\n")
with open(respf,'a') as f:
    f.write(f"\n===== {id_} (pass {pass_}) :: {prompt} =====\n")
    f.write(f"[brand={bm} | sources={'; '.join(domains) or '-'}]\n{text.strip()[:3000]}\n")
print(f"{id_} p{pass_}: brand={bm} src={len(domains)} len={len(text)}")
PYEOF
}

mapfile -t ROWS < <(tail -n +2 "$(cd "$HERE/.." && pwd)/prompts/prompt-set.tsv")
for pass in 1 2; do
  prefix=$([ "$pass" = 1 ] && echo "$P1" || echo "$P2")
  echo "=== PASS $pass ($([ "$pass" = 1 ] && echo no-browse || echo web-search)) ==="
  for row in "${ROWS[@]}"; do
    IFS=$'\t' read -r id cat raw <<< "$row"
    run_one "$id" "$cat" "$(fill "$raw")" "$pass" "$prefix"
    sleep 2
  done
done
echo ""
echo "Done. $TSV | $RESP | screenshots in $shots/"
echo "Now score against your ground-truth table and diff Pass 1 vs Pass 2 (the headline slide)."
