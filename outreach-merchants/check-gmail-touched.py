#!/usr/bin/env python3
"""For a given domain, query gog gmail (both authed accounts) and return all
email addresses we've corresponded with at that domain. Used by verify-staff.py
as an extra dedup layer on top of sibling outreach logs.

Usage:
  python3 check-gmail-touched.py <domain>          # print one email per line
  python3 check-gmail-touched.py <domain> --json   # structured

Returns the union of: addresses in TO of our sent messages + addresses in FROM
of received messages at that domain. Deduped, lowercased.
"""
import argparse
import json
import os
import re
import subprocess
import sys

ACCOUNTS = [
    "armaan.priyadarshan.29@dartmouth.edu",
    "armaanp4423@gmail.com",
]
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")


def search(account: str, query: str, max_results: int = 50) -> list[dict]:
    env = os.environ.copy()
    if "GOG_KEYRING_PASSWORD" not in env:
        # Caller must export this; we don't hardcode the keyring password.
        return []
    cmd = [
        "gog", "--account", account, "gmail", "messages", "search", query,
        "--max", str(max_results), "--json",
    ]
    try:
        r = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=30)
        if r.returncode != 0:
            return []
        d = json.loads(r.stdout)
        return d.get("messages", []) if isinstance(d, dict) else (d or [])
    except Exception:
        return []


def get_headers(account: str, mid: str) -> dict:
    env = os.environ.copy()
    cmd = ["gog", "--account", account, "gmail", "get", mid, "--json"]
    try:
        r = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=30)
        if r.returncode != 0:
            return {}
        d = json.loads(r.stdout)
        return d.get("headers", {}) or {}
    except Exception:
        return {}


def extract_addresses_at_domain(text: str, domain: str) -> list[str]:
    """Return all email addresses in text whose domain matches."""
    domain = domain.lower().lstrip("www.")
    out = []
    for m in EMAIL_RE.finditer(text or ""):
        em = m.group(0).lower()
        if em.endswith("@" + domain) or em.endswith("." + domain):
            out.append(em)
    return out


def touched_at_domain(domain: str) -> set[str]:
    """Across both accounts, return all email addresses at `domain` we've
    corresponded with (sent to OR received from).
    """
    touched: set[str] = set()
    query = f"to:{domain} OR from:{domain}"
    for acct in ACCOUNTS:
        msgs = search(acct, query, max_results=50)
        for m in msgs:
            mid = m.get("id")
            if not mid:
                continue
            # The search result already has the FROM in our experience —
            # extract that as a candidate, then fetch headers for the TO.
            frm = (m.get("from") or "").lower()
            touched.update(extract_addresses_at_domain(frm, domain))
            h = get_headers(acct, mid)
            for key in ("to", "cc", "from", "bcc"):
                val = h.get(key) or ""
                touched.update(extract_addresses_at_domain(val, domain))
    return touched


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("domain")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    addrs = sorted(touched_at_domain(args.domain))
    if args.json:
        print(json.dumps({"domain": args.domain, "touched": addrs, "count": len(addrs)}))
    else:
        for a in addrs:
            print(a)
        print(f"# total: {len(addrs)}", file=sys.stderr)


if __name__ == "__main__":
    main()
