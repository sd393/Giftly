#!/usr/bin/env python3
"""LinkedIn company People-tab scraper using the /connect-chrome headed browser.

Per brand:
  1. Google search "<brand> linkedin company" -> extract /company/<slug>/ URL
  2. For each keyword filter (director, vp, head, marketing):
     navigate /company/<slug>/people/?keywords=<kw>, scroll to load cards
  3. Extract every visible profile card preview (slug, name, headline, degree)
  4. Filter to senior + relevant roles (drops false positives by headline match)
  5. Append to contacts.csv

Requires the gstack browse binary running in headed mode via /connect-chrome
(LinkedIn cookies must be set, i.e. user is logged in to LinkedIn in that
Chromium window).

Output schema matches what verify-staff.py expects:
  domain, brand, name, title, source_url, notes

Failure-mode notes inline. See OUTREACH.md for the broader playbook.
"""
import argparse
import csv
import json
import os
import re
import subprocess
import sys
import time
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).parent
TRIMMED_CSV = ROOT / "trimmed.csv"
CONTACTS_CSV = ROOT / "contacts.csv"
BROWSE_BIN = os.environ.get(
    "BROWSE_BIN",
    str(Path.home() / ".claude/skills/gstack/browse/dist/browse"),
)

# 4 keywords (down from 9). Covers the senior tier with minimum
# LinkedIn page hits. Each adds ~5-7s per brand.
MIDSIZE_KEYWORDS = ["director", "vp", "head", "marketing"]

# Sleep between LinkedIn pages within a brand (anti-bot)
SLEEP_BETWEEN_KW = 4.0
# Sleep between brands (anti-bot)
SLEEP_BETWEEN_BRANDS = 20.0

# Two-tier filter:
#   1. C-suite / Founder titles always pass (regardless of function word)
#   2. All other senior titles (VP, Director, Head) MUST have a relevant
#      function word (marketing, brand, ecommerce, etc.) in the same headline
#   3. Junior-override words (assistant, coordinator, intern) reject even
#      if a senior word also appears (catches "Senior Executive Assistant
#      to Founder & CEO" — the "to founder" matched generic "founder" but
#      she's an EA, not a founder)
CSUITE_RE = re.compile(
    r"\b(c[ema]o|cfo|cto|cpo|cro|cco|cdo|"
    r"founder|co[-\s]?founder|owner|maker|"
    # president — but NOT vice/sr/senior/asst/assistant/svp/vp president
    r"(?<!vice\s)(?<!sr\s)(?<!senior\s)(?<!asst\s)(?<!assistant\s)(?<!svp\s)(?<!vp\s)president|"
    r"chief\s+(?:executive|operating|marketing|technology|financial|"
    r"product|revenue|creative|brand|customer|digital|growth)\s+officer)\b",
    re.IGNORECASE,
)
SENIOR_TITLE_RE = re.compile(
    r"\b(svp|evp|\bvp\b|vice\s+president|"
    r"head\s+of|senior\s+director|director|associate\s+director)\b",
    re.IGNORECASE,
)
RELEVANT_FN_RE = re.compile(
    r"\b(marketing|brand|ecommerce|e-commerce|growth|sales|social|"
    r"communications|customer|retention|lifecycle|influencer|integrated|"
    r"performance|partnerships|merchandising|creative|content|"
    r"experience|acquisition|digital|product\s+marketing|"
    r"product\s+management|head\s+of\s+product)\b",
    re.IGNORECASE,
)
JUNIOR_OVERRIDE_RE = re.compile(
    r"\b(assistant|coordinator|intern|fellow|freelance|contractor|"
    r"advisor|consultant|specialist)\b",
    re.IGNORECASE,
)


def is_senior_and_relevant(headline: str) -> bool:
    if not headline:
        return False
    if JUNIOR_OVERRIDE_RE.search(headline):
        return False  # EA / coordinator overrides any senior word
    if CSUITE_RE.search(headline):
        return True  # C-suite + founder always in
    return bool(SENIOR_TITLE_RE.search(headline) and RELEVANT_FN_RE.search(headline))

# Headline must match the brand to confirm CURRENT employment.
# We match brand_name fuzzily (lowercase, stripped of punctuation).
def _normalize_brand(b: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (b or "").lower())


def headline_mentions_brand(headline: str, brand: str) -> bool:
    """True if the card headline mentions the brand name. Catches the
    'works at X' / '@ X' / 'X Home' / 'X | role' patterns."""
    h = _normalize_brand(headline)
    b = _normalize_brand(brand)
    if not b:
        return True  # no brand to match → accept all
    return b in h


def _browse(*args: str, timeout: int = 30) -> tuple[int, str]:
    r = subprocess.run([BROWSE_BIN, *args], capture_output=True, text=True, timeout=timeout)
    return r.returncode, r.stdout


def google_find_company_slug(brand: str, log) -> str | None:
    """Google '<brand> linkedin company', extract /company/<slug>/ URL.
    Returns the slug or None."""
    q = urllib.parse.quote(f"{brand} linkedin company")
    _browse("goto", f"https://www.google.com/search?q={q}")
    time.sleep(2.5)
    rc, out = _browse("js", """
(function(){
  const all = Array.from(document.querySelectorAll('a[href*="linkedin.com/company/"]'));
  for (const a of all) {
    const m = a.href.match(/linkedin\\.com\\/company\\/([^\\/?\\#]+)/);
    if (m && m[1] && !['life','life-at'].includes(m[1])) return m[1];
  }
  return null;
})()
""")
    if rc != 0:
        return None
    slug = (out or "").strip().strip('"').strip()
    # Strip BEGIN/END UNTRUSTED wrappers if present
    slug = re.sub(r"^---.*?\n", "", slug, flags=re.DOTALL).strip().strip('"').strip()
    if slug == "null" or not slug:
        return None
    return slug


def fetch_people_cards(slug: str, keyword: str, log) -> list[dict]:
    """Hit /company/<slug>/people/?keywords=<kw>, scroll, return cards."""
    url = f"https://www.linkedin.com/company/{slug}/people/?keywords={urllib.parse.quote(keyword)}"
    _browse("goto", url)
    time.sleep(SLEEP_BETWEEN_KW)
    # Scroll 3 times to load lazy cards
    for _ in range(3):
        _browse("js", "window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(1.0)
    # Extract all card previews
    rc, out = _browse("js", """
(function(){
  const links = Array.from(document.querySelectorAll('a[href*="/in/"]'));
  const seen = new Set();
  const out = [];
  for (const a of links) {
    const m = a.href.match(/linkedin\\.com\\/in\\/([^\\/?\\#]+)/);
    if (!m) continue;
    const slug = m[1];
    if (seen.has(slug) || slug.startsWith('ACoA')) continue;
    seen.add(slug);
    const card = a.closest('li, .org-people-profile-card, .artdeco-entity-lockup');
    const txt = card ? card.innerText.replace(/\\n+/g, ' | ') : '';
    if (!txt || txt.length < 5) continue;
    // Parse name + headline + degree from typical card text
    // "Name |   | 2nd degree connection | · 2nd | Headline"
    const parts = txt.split('|').map(s => s.trim()).filter(Boolean);
    const name = parts[0] || '';
    let headline = '';
    for (let i = 1; i < parts.length; i++) {
      if (/\\d(?:st|nd|rd|th)/.test(parts[i])) continue;
      if (parts[i].length > 15) { headline = parts[i]; break; }
    }
    if (!headline && parts.length > 2) headline = parts[parts.length - 1];
    out.push({slug, name, headline: headline.slice(0, 200)});
  }
  return JSON.stringify(out);
})()
""")
    if rc != 0:
        return []
    raw = (out or "").strip()
    raw = re.sub(r"^---.*?\n", "", raw, flags=re.DOTALL).strip().strip('"')
    raw = raw.replace('\\"', '"')
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return []


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", default=str(TRIMMED_CSV))
    ap.add_argument("--output", default=str(CONTACTS_CSV))
    ap.add_argument("--start", type=int, default=0, help="Skip first N brands (resume)")
    ap.add_argument("--limit", type=int, default=0, help="Process only N brands (0 = all)")
    args = ap.parse_args()

    brands = list(csv.DictReader(open(args.input)))
    if args.start:
        brands = brands[args.start:]
    if args.limit:
        brands = brands[:args.limit]
    print(f"discovering staff via LinkedIn for {len(brands)} brands", flush=True)

    all_contacts = []
    for i, b in enumerate(brands, 1):
        brand_name = b["brand"]
        domain = b["domain"]
        def log(msg):
            print(f"  [{i:>2}/{len(brands)}] {brand_name}: {msg}", flush=True)

        slug = google_find_company_slug(brand_name, log)
        if not slug:
            log("NO_LINKEDIN_SLUG_FOUND, skipping")
            continue
        log(f"slug = {slug}")

        # Across all keywords, dedupe by LinkedIn profile slug
        per_brand: dict[str, dict] = {}  # slug -> contact row
        for kw in MIDSIZE_KEYWORDS:
            cards = fetch_people_cards(slug, kw, log)
            kept = 0
            for c in cards:
                if not is_senior_and_relevant(c.get("headline", "")):
                    continue
                if not headline_mentions_brand(c.get("headline", ""), brand_name):
                    continue
                if c["slug"] in per_brand:
                    continue
                per_brand[c["slug"]] = {
                    "domain": domain,
                    "brand": brand_name,
                    "name": c["name"],
                    "title": c.get("headline", "")[:160],
                    "source_url": f"https://www.linkedin.com/in/{c['slug']}/",
                    "notes": f"kw={kw}",
                }
                kept += 1
            log(f"  kw={kw}: {len(cards)} cards, {kept} kept")
        log(f"-> {len(per_brand)} unique senior+relevant contacts")
        all_contacts.extend(per_brand.values())
        if i < len(brands):
            time.sleep(SLEEP_BETWEEN_BRANDS)

    with open(args.output, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=[
            "domain", "brand", "name", "title", "source_url", "notes",
        ])
        w.writeheader(); w.writerows(all_contacts)
    print(f"\nwrote {len(all_contacts)} rows to {args.output}")


if __name__ == "__main__":
    main()
