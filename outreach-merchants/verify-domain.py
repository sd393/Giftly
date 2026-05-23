#!/usr/bin/env python3
"""Per-brand domain verification via Google search.

For each (brand, guessed_domain) row, Google the brand name in the headed
gstack browser, extract the FIRST organic (non-ad, non-knowledge-panel)
result's domain, and compare to the guess. Catches:
  - Wrong-domain guesses (wholeloops.com is a music plugin store, not skincare)
  - Brand-name collisions (multiple companies named "Bloom")
  - Renamed/acquired/sunset brands

Output: midsize-500-verified.csv with columns:
  brand, domain_guess, domain_google, match (yes|no|unclear), top_url, notes

Why headed browser: Google captcha-flags headless rapidly. Headed + real
user fingerprint via /connect-chrome bypasses bot detection.
Why ~3s sleep: respect Google's hidden rate limit; 500 queries with no
delay will get the session flagged.
"""
import argparse
import csv
import os
import re
import subprocess
import sys
import time
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).parent
INPUT_CSV = ROOT / "midsize-500.csv"
OUTPUT_CSV = ROOT / "midsize-500-verified.csv"
BROWSE_BIN = os.environ.get(
    "BROWSE_BIN",
    str(Path.home() / ".claude/skills/gstack/browse/dist/browse"),
)
SLEEP_BETWEEN = 3.0  # seconds between Google queries

# Domains we never want to consider as "the brand's domain" — Google
# meta-results, aggregator sites, social.
GOOGLE_NOISE_DOMAINS = {
    "google.com","google.co.uk","support.google.com","accounts.google.com",
    "youtube.com","youtu.be","facebook.com","instagram.com","twitter.com",
    "x.com","linkedin.com","tiktok.com","pinterest.com","reddit.com",
    "wikipedia.org","en.wikipedia.org",
    "amazon.com","ebay.com","walmart.com","target.com",
    "yelp.com","yellowpages.com","bbb.org",
    "crunchbase.com","pitchbook.com","rocketreach.co","apollo.io","zoominfo.com",
    "indeed.com","glassdoor.com",
}


def _browse(*args: str, timeout: int = 30) -> tuple[int, str]:
    r = subprocess.run([BROWSE_BIN, *args], capture_output=True, text=True, timeout=timeout)
    return r.returncode, r.stdout


def extract_first_organic_domain() -> tuple[str | None, str | None]:
    """Pull the first organic result's domain from the current Google page.
    Returns (domain, full_url) or (None, None)."""
    # Get all result-area anchor URLs that aren't ads/Google-meta.
    # The "div#search" container holds organic + ads; ad cards have aria
    # "Sponsored" or data-text-ad attribute. Knowledge Panel is right side.
    rc, out = _browse("js", """
(function(){
  const all = Array.from(document.querySelectorAll('div#search a[href], div#rso a[href]'));
  for (const a of all) {
    const href = a.href;
    if (!href || !href.startsWith('http')) continue;
    // Skip ad results
    const card = a.closest('[data-text-ad], [aria-label*="Sponsored"], .commercial-unit-desktop-top');
    if (card) continue;
    // Skip Google internal links
    if (/^https?:\\/\\/(www\\.)?google\\./.test(href)) continue;
    // Must be a top-level link with visible text
    if (!a.innerText || a.innerText.trim().length < 3) continue;
    return href;
  }
  return null;
})()
""")
    if rc != 0:
        return None, None
    url = (out or "").strip()
    # Strip "--- BEGIN UNTRUSTED" wrappers if present
    url = re.sub(r"^---.*?\n", "", url, flags=re.DOTALL)
    url = url.strip().strip('"').strip()
    if not url or url == "null":
        return None, None
    m = re.match(r"https?://([^/?\#]+)", url)
    if not m:
        return None, None
    domain = m.group(1).lower()
    if domain.startswith("www."):
        domain = domain[4:]
    return domain, url


def _norm(d: str) -> str:
    """Lowercase + remove leading 'www.' (using removeprefix, NOT lstrip
    which would strip individual chars 'w'/'.'/'.' from strings starting
    with w like wearpact.com)."""
    return (d or "").lower().removeprefix("www.")


def classify_match(guess: str, google_domain: str | None) -> str:
    if not google_domain:
        return "unclear"
    g = _norm(guess)
    gd = _norm(google_domain)
    if gd == g:
        return "yes"
    # Allow partial match: same root domain ignoring subdomain
    if gd.endswith("." + g) or g.endswith("." + gd):
        return "yes"
    return "no"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", default=str(INPUT_CSV))
    ap.add_argument("--output", default=str(OUTPUT_CSV))
    ap.add_argument("--start", type=int, default=0, help="Skip first N rows (for resume)")
    ap.add_argument("--limit", type=int, default=0, help="Process only N rows (0 = all)")
    ap.add_argument("--sleep", type=float, default=SLEEP_BETWEEN)
    args = ap.parse_args()

    rows = list(csv.DictReader(open(args.input)))
    if args.start:
        rows = rows[args.start:]
    if args.limit:
        rows = rows[:args.limit]
    print(f"verifying {len(rows)} brands via Google search", flush=True)

    out_rows = []
    matched = mismatched = unclear = 0
    for i, r in enumerate(rows, 1):
        brand = r.get("brand", "")
        guess = r.get("domain", "")
        # URL-encode brand
        q = urllib.parse.quote(brand)
        _browse("goto", f"https://www.google.com/search?q={q}")
        time.sleep(args.sleep)
        google_domain, top_url = extract_first_organic_domain()
        match = classify_match(guess, google_domain)
        if match == "yes": matched += 1
        elif match == "no": mismatched += 1
        else: unclear += 1
        flag = {"yes":"✓","no":"✗","unclear":"?"}[match]
        print(f"  [{i:>3}/{len(rows)}] {flag} {brand:<28} guess={guess:<30} google={google_domain or '-':<30}", flush=True)
        out_rows.append({
            "brand": brand,
            "domain_guess": guess,
            "domain_google": google_domain or "",
            "match": match,
            "top_url": top_url or "",
            "category": r.get("category", ""),
            "notes": "",
        })

    with open(args.output, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=[
            "brand","domain_guess","domain_google","match","top_url","category","notes",
        ])
        w.writeheader(); w.writerows(out_rows)
    print(f"\n=== SUMMARY ===")
    print(f"  matched:    {matched}")
    print(f"  mismatched: {mismatched}")
    print(f"  unclear:    {unclear}")
    print(f"-> {args.output}")


if __name__ == "__main__":
    main()
