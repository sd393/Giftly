#!/usr/bin/env python3
"""Scrape contact emails for a brand batch.

Reads <batch>.csv, fetches each brand's contact/about pages, extracts emails
on the brand's own root domain, and rewrites the CSV with `email` and
`email_source` columns. Falls back to hello@{domain} when nothing matches.

Stdout is summary-only. Per-row detail goes to logs/scrape-<batch-stem>.log.
"""
import csv
import gzip
import re
import socket
import ssl
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).parent
_args = [a for a in sys.argv[1:] if not a.startswith("--")]
CSV_PATH = Path(_args[0]) if _args else (ROOT / "batch.csv")
VERBOSE = "--verbose" in sys.argv or "-v" in sys.argv
LOG_DIR = ROOT / "logs"

PATHS = ["", "/contact", "/contact-us", "/pages/contact", "/pages/contact-us",
         "/get-in-touch", "/about", "/about-us", "/pages/about"]
TIMEOUT = 6
WORKERS = 24
MAX_BYTES = 400_000
BRAND_DEADLINE = 45

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Encoding": "gzip",
    "Accept-Language": "en-US,en;q=0.9",
    "Connection": "close",
}

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")

PREFERRED_LOCALS = (
    "hello", "hi", "contact", "info", "team", "press",
    "partnerships", "partners", "collabs", "collab", "creators",
    "founders", "founder", "newbusiness", "new-business",
    "sales", "biz", "business", "support",
)

DOMAIN_BLOCKLIST_SUFFIXES = (
    "shopify.com", "klaviyo.com", "stripe.com", "gorgias.com",
    "sentry.io", "hubspot.com", "salesforce.com", "mailchimp.com",
    "googleapis.com", "google.com", "facebook.com", "instagram.com",
    "twitter.com", "linkedin.com", "x.com", "tiktok.com", "youtube.com",
    "pinterest.com", "wixpress.com", "wix.com", "squarespace.com",
    "godaddy.com", "wordpress.com", "amazonaws.com", "cloudfront.net",
    "wsimg.com", "example.com", "domain.com", "yourdomain.com",
    "yourcompany.com", "sentry.wixpress.com",
)

JUNK_LOCALS = {"example", "name", "yourname", "you", "user", "noreply", "no-reply"}

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
socket.setdefaulttimeout(TIMEOUT)


def root_domain(d: str) -> str:
    parts = d.lower().split(".")
    if len(parts) <= 2:
        return d.lower()
    if parts[0] in {"www", "shop", "store", "get", "try", "my", "the", "us", "uk"}:
        return ".".join(parts[1:])
    return d.lower()


def fetch(url: str) -> str | None:
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=TIMEOUT, context=ctx) as r:
            data = r.read(MAX_BYTES)
            if r.headers.get("Content-Encoding") == "gzip":
                try:
                    data = gzip.decompress(data)
                except OSError:
                    return None
            return data.decode("utf-8", errors="ignore")
    except Exception:
        return None


def score(local: str) -> tuple[int, str]:
    local = local.lower()
    for i, p in enumerate(PREFERRED_LOCALS):
        if local == p:
            return (i, local)
    return (1000, local)


def extract(html: str, brand_root: str) -> list[str]:
    cands = set()
    for m in re.finditer(r'mailto:([^"\'?\s>]+)', html, flags=re.IGNORECASE):
        cands.add(m.group(1).strip().lower())
    for m in EMAIL_RE.finditer(html):
        cands.add(m.group(0).strip().lower())
    out = []
    for e in cands:
        local, _, dom = e.partition("@")
        if not dom or "." not in dom:
            continue
        if any(dom.endswith(b) for b in DOMAIN_BLOCKLIST_SUFFIXES):
            continue
        if local in JUNK_LOCALS:
            continue
        if not local.replace(".", "").replace("-", "").replace("_", "").isalnum():
            continue
        if len(local) > 40 or len(dom) > 60:
            continue
        if root_domain(dom) != brand_root:
            continue
        out.append(e)
    return sorted(set(out), key=lambda x: score(x.split("@", 1)[0]))


def find_email(domain: str) -> tuple[str, str]:
    brand_root = root_domain(domain)
    bases = [f"https://{brand_root}"]
    if brand_root != domain:
        bases.append(f"https://{domain}")
    deadline = time.time() + BRAND_DEADLINE
    for b in bases:
        for path in PATHS:
            if time.time() > deadline:
                return f"hello@{brand_root}", "fallback"
            html = fetch(b + path)
            if not html:
                continue
            emails = extract(html, brand_root)
            if emails:
                return emails[0], (b + path)
    return f"hello@{brand_root}", "fallback"


def process(row: dict) -> dict:
    domain = row["domain"].strip().lower()
    try:
        email, src = find_email(domain)
    except Exception as e:
        email, src = f"hello@{domain}", f"err:{type(e).__name__}"
    row["email"] = email
    row["email_source"] = src
    return row


def main():
    with CSV_PATH.open() as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        base_fields = list(reader.fieldnames)
    fieldnames = base_fields + [c for c in ("email", "email_source") if c not in base_fields]

    LOG_DIR.mkdir(exist_ok=True)
    log_path = LOG_DIR / f"scrape-{CSV_PATH.stem}.log"
    log_f = log_path.open("w")
    started = time.time()
    out_rows = [None] * len(rows)
    done = found = fallback = 0
    errors: list[tuple[str, str]] = []

    def log(line: str) -> None:
        log_f.write(line + "\n")
        log_f.flush()
        if VERBOSE:
            print(line, flush=True)

    def snapshot():
        with CSV_PATH.open("w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=fieldnames)
            w.writeheader()
            for idx, row in enumerate(out_rows):
                if row is not None:
                    w.writerow(row)
                else:
                    orig = dict(rows[idx])
                    orig.setdefault("email", "")
                    orig.setdefault("email_source", "")
                    w.writerow(orig)

    log(f"scraping {len(rows)} brands, {WORKERS} workers")
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        futs = {ex.submit(process, dict(r)): i for i, r in enumerate(rows)}
        for fut in as_completed(futs):
            i = futs[fut]
            r = fut.result()
            out_rows[i] = r
            done += 1
            src = r["email_source"]
            if src == "fallback" or src.startswith("err:"):
                fallback += 1
                if src.startswith("err:"):
                    errors.append((r["brand"], src))
            else:
                found += 1
            log(f"[{done}/{len(rows)}] {r['brand']:<30} {r['email']:<40} {src}")

    snapshot()
    log_f.close()
    elapsed = int(time.time() - started)
    print(f"found={found} fallback={fallback} elapsed={elapsed}s log={log_path.relative_to(ROOT)}")
    for brand, src in errors[:3]:
        print(f"  warn: {brand} {src}")


if __name__ == "__main__":
    main()
