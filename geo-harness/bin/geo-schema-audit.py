#!/usr/bin/env python3
"""geo-schema-audit.py — Layer 2. Extract a PDP's JSON-LD and flag GEO-relevant gaps.

Usage:
    bin/geo-schema-audit.py <product-page-url> [more-urls...]

Reports, per page: the JSON-LD @types present, the Product node's fields, and the
gaps that matter for AI citation/transaction:
  - sku present?              (agents need a stable catalog id)
  - offers: 1 flat vs N per-variant (per-variant w/ price+gtin+url is far richer)
  - gtin / real barcode present? (NB: a Shopify 'mpn' is often the product id, not a GTIN)
  - FAQPage schema?           (AI loves structured Q&A)
  - Review schema?            (vs only AggregateRating)
  - priceSpecification?       (member/tier pricing as structured data)
"""
import json, re, sys, urllib.request

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    return urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "ignore")


def audit(url):
    html = fetch(url)
    blocks = re.findall(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', html, re.S)
    types, product = [], None
    for b in blocks:
        try:
            data = json.loads(b.strip(), strict=False)
        except Exception:
            continue
        for it in (data if isinstance(data, list) else [data]):
            if not isinstance(it, dict):
                continue
            t = it.get("@type")
            types.append(t)
            if t == "Product":
                product = it
    print("=" * 72)
    print(url)
    print("=" * 72)
    print(f"  JSON-LD blocks: {len(blocks)} | @types: {', '.join(str(t) for t in types) or '(none)'}")
    has_faq = "FAQPage" in types
    has_review = bool(re.search(r'"@type"\s*:\s*"Review"', html))
    if not product:
        print("  !! no Product schema found")
        print(f"  FAQPage: {'Y' if has_faq else 'N'} | Review schema: {'Y' if has_review else 'N'}")
        return
    offers = product.get("offers")
    ol = offers if isinstance(offers, list) else ([offers] if offers else [])
    gtin = product.get("gtin13") or product.get("gtin12") or product.get("gtin")
    offer_skus = [o.get("sku") for o in ol if isinstance(o, dict)]
    offer_gtins = [o.get("gtin12") or o.get("gtin13") or o.get("gtin") for o in ol if isinstance(o, dict)]
    agg = product.get("aggregateRating") or {}
    has_pricespec = "priceSpecification" in json.dumps(product)
    print(f"  Product keys: {', '.join(sorted(product.keys()))}")
    print(f"  name: {product.get('name')}")
    print(f"  sku (product-level): {product.get('sku')}   <-- null/absent = GEO gap")
    print(f"  mpn: {product.get('mpn')}  (NB: a 13+ digit mpn is often the Shopify product id, not a GTIN)")
    print(f"  gtin: {gtin}")
    print(f"  offers: {len(ol)}  ({'FLAT single offer = gap' if len(ol)<=1 else 'per-variant'})")
    if ol:
        print(f"    per-offer sku present: {sum(1 for s in offer_skus if s)}/{len(ol)} | "
              f"per-offer gtin present: {sum(1 for g in offer_gtins if g)}/{len(ol)}")
    if agg:
        print(f"  aggregateRating: {agg.get('ratingValue')} ({agg.get('reviewCount') or agg.get('ratingCount')})")
    print(f"  FAQPage schema: {'Y' if has_faq else 'N (gap)'}")
    print(f"  Review schema:  {'Y' if has_review else 'N (only AggregateRating at best — gap)'}")
    print(f"  priceSpecification: {'Y' if has_pricespec else 'N (member/tier price not structured — gap)'}")
    print()


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    for url in sys.argv[1:]:
        try:
            audit(url)
        except Exception as e:
            print(f"  ERROR fetching {url}: {e}")


if __name__ == "__main__":
    main()
