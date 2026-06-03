#!/usr/bin/env bash
# geo-product-json.sh — Layer 2. Inspect the open Shopify product .json (rich data) and
# check whether member/loyalty pricing is exposed in ANY machine-readable field.
# Usage: bin/geo-product-json.sh [product-handle]   (defaults to HERO_PRODUCT_HANDLE)
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib/common.sh"
require_var TARGET_WWW

HANDLE="${1:-${HERO_PRODUCT_HANDLE:-}}"
[ -n "$HANDLE" ] || { echo "ERROR: pass a product handle or set HERO_PRODUCT_HANDLE"; exit 1; }
out="$GEO_OUT/product-json-$HANDLE.txt"
JURL="$TARGET_WWW/products/$HANDLE.json"
PURL="$TARGET_WWW/products/$HANDLE"

{
echo "=== Product .json richness + member-price exposure — $HANDLE ==="
echo "json: $JURL"
echo ""
echo "-- .json fields (variants, SKUs, barcodes, live inventory) --"
curl -sS -A "$UA_BROWSER" --max-time 25 "$JURL" | python3 -c "
import json,sys
try: p=json.load(sys.stdin)['product']
except Exception as e: print('  (no product json:',e,')'); sys.exit(0)
print('  title:',p.get('title'),'| type:',p.get('product_type'),'| vendor:',p.get('vendor'))
print('  tags:',p.get('tags'))
vs=p.get('variants',[])
print(f'  variants: {len(vs)}')
for v in vs[:8]:
    print(f\"    - {v.get('title')}: \${v.get('price')} | sku {v.get('sku')} | barcode {v.get('barcode')} | inv {v.get('inventory_quantity')}\")
mem_keys=[k for k in json.dumps(p).split('\"') if 'member' in k.lower() or 'tier' in k.lower()]
print('  member/tier KEYS in json:', mem_keys or '(none — only possibly a tag value)')
"
echo ""
echo "-- member-price exposure in static PDP HTML --"
html=$(curl -sS -A "$UA_BROWSER" --max-time 25 "$PURL")
spans=$(echo "$html" | grep -oE 'member[-_]?price' | wc -l | tr -d ' ')
nonempty=$(echo "$html" | grep -oE 'member[-_]?price[^>]*>[^<][^<]+' | wc -l | tr -d ' ')
echo "  'member-price' span occurrences: $spans"
echo "  ...with non-empty inner text:     $nonempty   (0 = JS-only placeholders = invisible to non-rendering crawlers)"
echo ""
echo "READ: the .json exposes real SKUs/barcodes/inventory openly (no auth). But if member"
echo "pricing appears in NO json field AND the HTML member-price spans are empty placeholders,"
echo "the membership's core value (the member price) is invisible to every AI surface."
} | tee "$out"
echo "-> $out"
