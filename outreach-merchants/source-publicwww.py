#!/usr/bin/env python3
"""Source candidate Shopify DTC merchant domains via PublicWWW.

Runs multiple narrow PublicWWW queries through the gstack browse
binary (PublicWWW serves a JS shell to plain requests, so a real
browser is required), aggregates the visible domains, drops known
noise (publishers, mega-brands, multi-brand retailers, dev stores) and
anything already in any sibling outreach log, writes candidates.csv.

Why PublicWWW: free, no login, returns sites whose HTML/response
headers match a string. Querying for "Powered by Shopify" + a niche
keyword surfaces single-brand Shopify storefronts in that vertical.
Free tier hides URL after the top ~5 visible rows per query (those
are dropped here).

Output: candidates.csv with columns: domain, alexa_rank, source_query,
snippet.

Usage:
  python3 source-publicwww.py                # uses DEFAULT_QUERIES below
  python3 source-publicwww.py -q "..." -q "..."   # custom queries
"""
import argparse
import csv
import os
import re
import subprocess
import sys
import tempfile
import time
import urllib.parse
from pathlib import Path

from bs4 import BeautifulSoup

BROWSE_BIN = os.environ.get(
    "BROWSE_BIN",
    str(Path.home() / ".claude/skills/gstack/browse/dist/browse"),
)

ROOT = Path(__file__).parent
REPO_ROOT = ROOT.parent
CANDIDATES_CSV = ROOT / "candidates.csv"

# Narrow indie clean-beauty / skincare queries. Each query pulls ~5
# visible domains on the free tier. Add or swap to widen the net.
DEFAULT_QUERIES = [
    '"Powered by Shopify" "clean beauty"',
    '"Powered by Shopify" "indie skincare"',
    '"Powered by Shopify" "natural skincare"',
    '"Powered by Shopify" "vegan skincare"',
    '"Powered by Shopify" "small batch skincare"',
    '"Powered by Shopify" "clean skincare"',
    '"Powered by Shopify" "non-toxic skincare"',
]

# Domains we never email regardless of source. Publishers that embed
# Shopify CDN, mega-brands way over the $1-5M MRR band, multi-brand
# retailers already covered by retailers/brands-audit campaigns.
HARDCODED_NOISE = {
    # Publishers
    "nypost.com", "thoughtcatalog.com", "letsencrypt.org",
    "reductress.com", "thehardtimes.net", "really-learn-english.com",
    "architectsjournal.co.uk", "osdownloader.org",
    "enmimaquinafunciona.com",
    # Mega-brands well over $5M MRR
    "champion.com", "kyliecosmetics.com", "ftd.com",
    "nuts.com", "brandless.com",
    # Multi-brand retailers (these belong in retailers campaign, not here)
    "credobeauty.com", "thedetoxmarket.com", "beauty-heroes.com",
    "contentbeautywellbeing.com", "shopoutofhand.com",
    "grove.co", "violetgrey.com",
    # Other false positives
    "vyper.io", "pitaka.myshopify.com", "vipjourneys.com",
    "mirascreen.com", "fr-fr.bakker.com", "maverickbyloganpaul.com",
}

# Mask token "***" in url cell means PublicWWW hides the URL behind
# signup/paid; we skip those rows.
MASKED_RE = re.compile(r"\*\*\*")
DOMAIN_RE = re.compile(r"^https?://([^/]+)/?", re.IGNORECASE)


def _browse(*args: str) -> str:
    """Invoke the gstack browse binary and return stdout (no leading marker)."""
    r = subprocess.run(
        [BROWSE_BIN, *args], capture_output=True, text=True, timeout=30,
    )
    if r.returncode != 0:
        raise RuntimeError(f"browse {args[0]!r} failed: {r.stderr.strip()}")
    out = r.stdout
    # Strip BEGIN/END UNTRUSTED markers if present
    out = re.sub(r"^--- BEGIN UNTRUSTED EXTERNAL CONTENT.*?\n", "", out)
    out = re.sub(r"\n--- END UNTRUSTED EXTERNAL CONTENT.*?$", "", out)
    return out


def fetch_publicwww(query: str) -> list[dict]:
    """Return [{rank, domain, snippet}, ...] for visible rows in this query."""
    url = f"https://publicwww.com/websites/{urllib.parse.quote(query)}/"
    _browse("goto", url)
    html = _browse("html", "table.table")
    soup = BeautifulSoup(html, "html.parser")

    out = []
    for tr in soup.select("tr"):
        cells = tr.find_all("td")
        if len(cells) < 3:
            continue
        rank_txt = cells[0].get_text(" ", strip=True)
        url_cell = cells[1]
        url_txt = url_cell.get_text(" ", strip=True)
        snippet_txt = cells[2].get_text(" ", strip=True) if len(cells) > 2 else ""
        if not rank_txt or MASKED_RE.search(url_txt) or MASKED_RE.search(rank_txt):
            continue
        # url_cell contains an <a href="https://example.com/">; prefer that
        a = url_cell.find("a", href=True)
        href = a["href"] if a else url_txt
        m = DOMAIN_RE.match(href)
        if not m:
            continue
        domain = m.group(1).lower()
        if domain.startswith("www."):
            domain = domain[4:]
        try:
            rank = int(rank_txt.replace(" ", "").replace(" ", "").replace(",", ""))
        except ValueError:
            rank = 0
        out.append({"rank": rank, "domain": domain, "snippet": snippet_txt[:160]})
    return out


def load_sibling_log_domains() -> set[str]:
    """All email-domains we've previously sent to, across all campaigns."""
    seen: set[str] = set()
    for csv_path in REPO_ROOT.glob("outreach*/outreach-log.csv"):
        try:
            with csv_path.open() as f:
                for row in csv.DictReader(f):
                    em = (row.get("email") or "").strip().lower()
                    if "@" in em:
                        seen.add(em.split("@", 1)[1])
        except Exception:
            continue
    return seen


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "-q", "--query", action="append", default=None,
        help="PublicWWW query string. Repeatable. Defaults baked in.",
    )
    ap.add_argument(
        "--sleep", type=float, default=2.5,
        help="Seconds between PublicWWW requests (default 2.5).",
    )
    args = ap.parse_args()

    queries = args.query or DEFAULT_QUERIES
    sibling_domains = load_sibling_log_domains()
    print(
        f"sibling-deduping against {len(sibling_domains)} email domains "
        f"across {len(list(REPO_ROOT.glob('outreach*/outreach-log.csv')))} sibling logs"
    )

    aggregated: dict[str, dict] = {}  # domain -> row dict (first source wins)
    skipped_noise = skipped_dup = skipped_sibling = 0

    for i, q in enumerate(queries, 1):
        try:
            rows = fetch_publicwww(q)
        except Exception as e:
            print(f"  [{i}/{len(queries)}] query failed: {q!r}: {e}", file=sys.stderr)
            continue
        kept = 0
        for r in rows:
            d = r["domain"]
            if d in HARDCODED_NOISE:
                skipped_noise += 1
                continue
            if d.endswith(".myshopify.com"):
                skipped_noise += 1
                continue
            if d in sibling_domains:
                skipped_sibling += 1
                continue
            if d in aggregated:
                skipped_dup += 1
                continue
            aggregated[d] = {
                "domain": d,
                "alexa_rank": r["rank"],
                "source_query": q,
                "snippet": r["snippet"],
            }
            kept += 1
        print(
            f"  [{i}/{len(queries)}] {q!r}: "
            f"raw={len(rows)} kept={kept}"
        )
        if i < len(queries):
            time.sleep(args.sleep)

    rows_out = sorted(aggregated.values(), key=lambda x: x["alexa_rank"], reverse=True)
    with CANDIDATES_CSV.open("w", newline="") as f:
        w = csv.DictWriter(
            f, fieldnames=["domain", "alexa_rank", "source_query", "snippet"]
        )
        w.writeheader()
        w.writerows(rows_out)

    print(
        f"\nwrote {len(rows_out)} candidates to {CANDIDATES_CSV.relative_to(ROOT)} "
        f"(skipped: noise={skipped_noise} dup={skipped_dup} sibling={skipped_sibling})"
    )


if __name__ == "__main__":
    main()
