#!/usr/bin/env python3
"""For each candidate domain, find named LEADERSHIP (not just founders, not
role addresses) by scraping the brand's team/about/leadership pages.

Extracts (Name, Title) pairs. The downstream verifier will pattern-guess
emails for each. No emails are extracted here — role addresses (info@,
hello@) are intentionally NOT collected since the v1.1 playbook is
named-people-only.

Input:  trimmed.csv (domain, brand)
Output: contacts.csv (domain, brand, name, title, source_url, notes)

Sources scraped per domain (in order, all that return 200 are mined):
  /pages/team, /pages/our-team, /pages/team-members, /pages/leadership,
  /pages/founders, /pages/founder, /pages/about, /pages/about-us,
  /pages/our-story, /pages/people, /pages/press, /pages/in-the-press,
  /

Extraction approach:
  1. Structured: find <h2|h3|h4> tags whose text is a Name (2-3 capitalized
     words, no blocklisted tokens), then check the next sibling text for
     a Title keyword (Founder/CEO/CMO/Head of/etc).
  2. Text-based: regex over the cleaned page text for inline patterns
     like "Jane Doe, CEO" / "CEO Jane Doe" / "Jane Doe — Head of Brand".
"""
import csv
import os
import re
import subprocess
import sys
from pathlib import Path

from bs4 import BeautifulSoup

ROOT = Path(__file__).parent
TRIMMED_CSV = ROOT / "trimmed.csv"
CONTACTS_CSV = ROOT / "contacts.csv"
BROWSE_BIN = os.environ.get(
    "BROWSE_BIN",
    str(Path.home() / ".claude/skills/gstack/browse/dist/browse"),
)

CANDIDATE_PATHS = [
    "/pages/team", "/pages/our-team", "/pages/team-members",
    "/pages/leadership", "/pages/our-leadership",
    "/pages/founders", "/pages/founder",
    "/pages/about", "/pages/about-us", "/pages/our-story",
    "/pages/people", "/pages/our-people",
    "/pages/press", "/pages/in-the-press", "/pages/press-kit",
    "/pages/meet-the-team",
    "/",
]

# Title regex — recognizes leadership titles in a single noun phrase.
# Used to detect "X is Title" or "Title X" or "X — Title".
TITLE_RE = re.compile(
    r"\b("
    r"Founder|Co[-\s]?Founder|Founder\s+(?:&|and)\s+CEO|"
    r"CEO|COO|CMO|CTO|CFO|CPO|CRO|CCO|CDO|"
    r"President|Vice\s+President|EVP|SVP|VP|"
    r"Chief\s+(?:Executive|Operating|Marketing|Technology|Financial|"
    r"Product|Revenue|Creative|Brand|Customer|Digital)\s+Officer|"
    r"Director\s+(?:of\s+)?(?:Marketing|Brand|Ecommerce|E-commerce|"
    r"Sales|Operations|Growth|Digital|Communications)|"
    r"Head\s+of\s+(?:Marketing|Brand|Ecommerce|E-commerce|"
    r"Sales|Operations|Growth|Digital|Communications|Product|People)|"
    r"VP\s+(?:of\s+)?(?:Marketing|Brand|Ecommerce|E-commerce|"
    r"Sales|Operations|Growth|Digital)|"
    r"Marketing\s+Manager|Brand\s+Manager|E-?commerce\s+Manager|"
    r"Creative\s+Director|Brand\s+Director|Marketing\s+Director|"
    r"Owner|Creator|Maker"
    r")\b",
    re.IGNORECASE,
)

# Name shape: 2-3 capitalized words, each 2-15 chars, allowing apostrophes
# and hyphens (O'Brien, Mary-Jane). Strict case to avoid noise.
_NAME = r"([A-Z][a-z'\-]{1,14}(?:\s+[A-Z][a-z'\-]{1,14}){1,2})"

# Named-group text patterns: avoid group-numbering confusion when TITLE_RE
# contains its own internal groups. Use (?P<name>...) and (?P<title>...).
_TITLE_INNER = TITLE_RE.pattern  # the title alternation, no outer group
# Critical: use [ \t]+ NOT \s+ between name tokens, otherwise the regex
# spans newlines and matches things like "About\nJana Blankenship".
_NAME_INNER = r"[A-Z][a-z'\-]{1,14}(?:[ \t]+[A-Z][a-z'\-]{1,14}){1,2}"

TEXT_PATTERNS: list[re.Pattern] = [
    # "Jane Doe, CEO" / "Jane Doe — Head of Marketing" / "Jane Doe | COO"
    re.compile(rf"\b(?P<name>{_NAME_INNER})\s*[,—–\-|:]\s*(?P<title>{_TITLE_INNER})\b"),
    # "CEO Jane Doe" / "CEO: Jane Doe" / "Founder, Jane Doe"
    re.compile(rf"\b(?P<title>{_TITLE_INNER})\s*[:,\-]?\s+(?P<name>{_NAME_INNER})\b"),
]

NAME_BLOCKLIST = {
    "us","we","our","the","and","for","with","from","your","their","this",
    "shop","skin","beauty","care","love","free","new","menu","cart",
    "since","made","ingredients","products","story","page","view",
    "ceo","coo","cmo","cto","cfo","evp","vp","president","director","head",
    "founder","founders","co-founder","cofounder","creator","owner","maker",
    "natural","organic","vegan","clean","skincare","skin care",
    "discover","introducing","meet","shopify","welcome","home","contact",
    "standards","ethos","experience","message","face","forward","sellers",
    "best","top","first","last","next","back",
    "i'm","i'll","you're","we're","they're","we'll","i've","that's",
    # Common cookie/footer/nav noise that has Name-shape
    "cookie","cookies","settings","privacy","policy","terms","read","more",
    "sign","email","subscribe","newsletter","accept","decline","manage",
    "preferences","close","skip","content",
    "join","get","try","add","buy","save","apply","track","find",
    "shipping","returns","support","help","faq",
}


def _browse(*args: str, timeout: int = 30) -> tuple[int, str]:
    r = subprocess.run([BROWSE_BIN, *args], capture_output=True, text=True, timeout=timeout)
    out = r.stdout
    out = re.sub(r"^--- BEGIN UNTRUSTED EXTERNAL CONTENT.*?\n", "", out)
    out = re.sub(r"\n--- END UNTRUSTED EXTERNAL CONTENT.*?$", "", out)
    return r.returncode, out


def fetch_page(url: str) -> tuple[int, str, str]:
    """Return (status, text, html). status -1 on error."""
    rc, nav = _browse("goto", url)
    if rc != 0:
        return -1, "", ""
    m = re.search(r"\((\d{3})\)", nav)
    status = int(m.group(1)) if m else -1
    if status >= 400 or status < 0:
        return status, "", ""
    _, text = _browse("text")
    _, html = _browse("html", "body")
    return status, text or "", html or ""


def is_real_name(s: str, brand: str = "") -> bool:
    parts = (s or "").strip().split()
    if not (2 <= len(parts) <= 3):
        return False
    for p in parts:
        if p.lower() in NAME_BLOCKLIST:
            return False
        if p.isupper() and len(p) > 2:
            return False
        if any(c.isdigit() for c in p):
            return False
        if sum(1 for c in p[1:] if c.isupper()) >= 1:
            return False
        if len(p) < 2:
            return False
        if not p[0].isupper():
            return False
    # Drop exact brand-name matches (e.g. "Captain Blankenship" the brand
    # is not a person, even though Jana Blankenship the founder shares one
    # token with it).
    if brand and s.strip().lower() == brand.strip().lower():
        return False
    return True


def normalize_title(t: str) -> str:
    """Collapse whitespace, title-case standardized."""
    t = re.sub(r"\s+", " ", (t or "")).strip()
    return t


# Founder-introduction verb patterns. Each NEEDS the verb adjacent to the
# name to qualify as a founder mention. Conservative: drops nav/product/
# category noise like "Sea Salt Spray" or "Mongo Kiss".
_FOUNDER_VERBS = (
    r"grew\s+up|started|created|founded|launched|opened|began|dreamed|"
    r"decided|moved|came|fell\s+in\s+love|was\s+born|lives|works|"
    r"built|developed|envisioned|crafted|formulated"
)
NARRATIVE_PATTERNS = [
    # "Jana Blankenship grew up in..." / "Joshua Morgan started LBA..."
    re.compile(rf"\b(?P<name>{_NAME_INNER})\s+(?:{_FOUNDER_VERBS})\b"),
    # "created in 2015 by Joshua Morgan" / "founded by Jana Blankenship"
    # The "(?:\s+\w+){0,4}\s+" gap allows phrases like "created in 2015 by"
    # or "founded back in college by" between the verb and "by".
    re.compile(rf"\b(?:{_FOUNDER_VERBS})(?:\s+\w+){{0,4}}\s+by\s+(?P<name>{_NAME_INNER})\b"),
]


def extract_from_text(text: str, brand: str = "") -> list[tuple[str, str]]:
    """Two passes:
      1. Explicit Name+Title patterns (Title near Name on same line).
      2. Narrative founder — Name adjacent to a founder-introduction verb
         (started/founded/grew up/etc). Drops nav/product noise that the
         old "any repeated capitalized phrase" heuristic let through.
    """
    found: dict[str, str] = {}
    for pat in TEXT_PATTERNS:
        for m in pat.finditer(text):
            name = m.group("name")
            title = m.group("title")
            if not is_real_name(name, brand):
                continue
            if name not in found:
                found[name] = normalize_title(title)
    for pat in NARRATIVE_PATTERNS:
        for m in pat.finditer(text):
            name = m.group("name")
            if not is_real_name(name, brand):
                continue
            if name not in found:
                found[name] = "implied founder"
    return list(found.items())


def extract_from_html(html: str, brand: str = "") -> list[tuple[str, str]]:
    """Structured DOM extraction: for each heading whose text is a Name,
    check the next sibling for a Title."""
    found: dict[str, str] = {}
    if not html:
        return []
    soup = BeautifulSoup(html, "html.parser")
    headings = soup.find_all(["h1", "h2", "h3", "h4", "h5", "p", "strong"])
    for el in headings:
        name = (el.get_text(" ", strip=True) or "").strip()
        # Strip surrounding punct
        name = re.sub(r"[\s—–\-,|:]+$", "", name)
        if not is_real_name(name, brand):
            continue
        # Look at next 3 sibling elements for a title hint
        title_text = ""
        sib = el
        for _ in range(3):
            sib = sib.find_next_sibling()
            if sib is None:
                break
            sib_text = (sib.get_text(" ", strip=True) or "").strip()
            tm = TITLE_RE.search(sib_text)
            if tm:
                title_text = tm.group(0)
                break
        # Also check parent/grandparent text in case team-card uses spans
        if not title_text:
            parent_text = el.parent.get_text(" ", strip=True) if el.parent else ""
            tm = TITLE_RE.search(parent_text[:300])
            if tm:
                title_text = tm.group(0)
        if title_text and name not in found:
            found[name] = normalize_title(title_text)
    return list(found.items())


def discover_staff_for_domain(domain: str, brand: str) -> list[dict]:
    """Scrape candidate pages, return list of contact rows."""
    bd = domain.lstrip("www.")
    people: dict[str, tuple[str, str]] = {}  # name -> (title, source_url)

    for path in CANDIDATE_PATHS:
        url = f"https://{bd}{path}"
        status, text, html = fetch_page(url)
        if status != 200:
            continue
        for n, t in extract_from_html(html, brand):
            people.setdefault(n, (t, url))
        for n, t in extract_from_text(text, brand):
            people.setdefault(n, (t, url))

    if not people:
        return [{
            "domain": bd, "brand": brand, "name": "", "title": "",
            "source_url": "", "notes": "no named staff found",
        }]
    rows = []
    for name, (title, src) in people.items():
        rows.append({
            "domain": bd, "brand": brand, "name": name, "title": title,
            "source_url": src, "notes": "",
        })
    return rows


def main():
    if not TRIMMED_CSV.exists():
        print(f"ERROR: {TRIMMED_CSV} not found", file=sys.stderr)
        sys.exit(1)
    targets = list(csv.DictReader(TRIMMED_CSV.open()))
    print(f"discovering staff for {len(targets)} domains")

    all_rows: list[dict] = []
    for i, t in enumerate(targets, 1):
        d = t["domain"]
        brand = t.get("brand", "")
        try:
            rows = discover_staff_for_domain(d, brand)
        except Exception as e:
            print(f"  [{i}/{len(targets)}] {d}: ERROR {type(e).__name__}: {e}")
            rows = [{"domain": d, "brand": brand, "name": "", "title": "",
                     "source_url": "", "notes": f"error: {e}"}]
        named = [r for r in rows if r["name"]]
        print(f"  [{i}/{len(targets)}] {d}: {len(named)} named -> "
              f"{[(r['name'], r['title'][:30]) for r in named[:5]]}")
        all_rows.extend(rows)

    with CONTACTS_CSV.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=[
            "domain","brand","name","title","source_url","notes",
        ])
        w.writeheader()
        w.writerows(all_rows)
    print(f"\nwrote {len(all_rows)} rows to {CONTACTS_CSV.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
