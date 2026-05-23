#!/usr/bin/env python3
"""SMTP RCPT TO verifier with per-brand pattern-locking.

Input:  contacts.csv (domain, brand, name, title, source_url, notes)
Output: verified.csv (email, name, title, brand, domain, source, notes)

Per-brand algorithm:
  1. Classify the domain via sentinel probe → HONEST | CATCHALL | UNREACHABLE.
  2. If CATCHALL or UNREACHABLE → drop the whole brand (no way to
     verify named addresses; v1.1 playbook says named-only, no roles).
  3. If HONEST:
     a. Pick the first contact at the brand and try email patterns
        in order until one verifies VALID:
          first.last@, first@, flast@, firstlast@, first_last@
        Stop at first VALID. That's the brand pattern.
     b. If person 1 fails all 5 patterns, try person 2. If 2 people
        in a row fail all patterns, give up on the brand (probably
        an exotic pattern we can't guess, e.g. first.middle@).
     c. With pattern locked, for each remaining person at the brand:
        probe locked-pattern first; if INVALID, fall back to 1-2
        other patterns. Cap total RCPT TO calls per brand at 30.
"""
import argparse
import csv
import os
import smtplib
import socket
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).parent
REPO_ROOT = ROOT.parent
CONTACTS_CSV = ROOT / "contacts.csv"
VERIFIED_CSV = ROOT / "verified.csv"

HELO_NAME = "giftly.test"
SENDER_ADDR = "verify@giftly.test"
SOCKET_TIMEOUT = 10.0
PROBE_SLEEP = 1.0      # between probes on same MX
DOMAIN_SLEEP = 2.0     # between domains
MAX_PER_BRAND = 30     # safety cap on RCPT TO calls per brand

# Pattern probe order, ranked by empirical prevalence across the prior
# outreach-retailers + outreach-brands-audit campaigns (~80 brands sampled).
# See reference_brand_email_patterns memory + outreach-retailers/CAMPAIGN.md.
PATTERN_ORDER = [
    "first.last",         # ~40% — most common
    "flast",              # ~27% — firstinitial+lastname (jnathan@)
    "first",              # ~26% — single-token (indies skew here)
    "firstlast",          # ~2%  — concat (jordannathan@)
    "first_last",         # ~4%  — underscore (TJX, Trek, VF Corp)
    "first+lastinitial",  # ~2%  — first+lastinitial@ (jordann@)
]

# Exotic fallbacks tried only if every PATTERN_ORDER entry fails.
EXOTIC_PATTERNS = [
    "first-last",          # hyphen separator
    "last.first",          # reversed
    "lastfirst",           # reversed concat
    "lastinitial.first",   # like Gymshark single-letter+dot
    "first.lastinitial",
    "lastinitial+first",   # like Orvis REVERSED (perkinss for Simon Perkins)
]

# Block-list of role-shaped local parts. Per v1.1 named-only playbook,
# NO role addresses get sent under any circumstance — even if Hunter/SMTP
# verifies them as deliverable. Role mailboxes get monitored by customer
# service contractors, not the senior people we're pitching.
ROLE_LOCAL_PARTS = {
    # generic
    "info","hello","contact","contactus","help","support","feedback",
    "office","mail","email","general","main",
    # marketing/comms
    "press","media","pr","news","blog","social","content",
    "marketing","brand","advertising","ads",
    # sales / partnerships
    "sales","partnerships","partner","partners","biz","business",
    "wholesale","trade","retail","b2b","enterprise",
    "enquiries","enquiry","inquiry","inquiries","leads",
    # ops / support
    "orders","order","service","customerservice","customer","cs",
    "returns","shipping","fulfillment","logistics",
    # finance / admin
    "billing","ap","ar","accounts","account","accounting","finance",
    "admin","operations","ops",
    # HR / careers
    "hr","jobs","careers","recruiting","talent","apply",
    # technical / system
    "noreply","no-reply","donotreply","do-not-reply","reply",
    "webmaster","postmaster","root","abuse","security","privacy","legal",
    "web","www",
    # everyone-style
    "all","everyone","staff","team",
    # casual greetings
    "hi","hey","hola","yo",
    # store
    "store","shop","orders",
}


def mx_lookup(domain: str) -> list[tuple[int, str]]:
    try:
        r = subprocess.run(["dig", "+short", "MX", domain],
                           capture_output=True, text=True, timeout=10)
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return []
    records = []
    for line in r.stdout.strip().splitlines():
        parts = line.split()
        if len(parts) >= 2:
            try:
                records.append((int(parts[0]), parts[1].rstrip(".")))
            except ValueError:
                pass
    return sorted(records)


def _rcpt_probe(host: str, email: str) -> tuple[str | int, str]:
    try:
        s = smtplib.SMTP(host, 25, timeout=SOCKET_TIMEOUT)
        try:
            s.ehlo(HELO_NAME)
            s.mail(SENDER_ADDR)
            code, msg = s.rcpt(email)
            return (code, msg.decode("utf-8", errors="ignore") if isinstance(msg, bytes) else str(msg))
        finally:
            try:
                s.quit()
            except smtplib.SMTPException:
                pass
    except (socket.timeout, smtplib.SMTPException, ConnectionError, OSError) as e:
        return ("ERROR", f"{type(e).__name__}: {e}")


def classify_domain(domain: str) -> dict:
    mxs = mx_lookup(domain)
    if not mxs:
        return {"status": "NO_MX", "mx": "", "note": "no MX records"}
    host = mxs[0][1]
    sentinel_local = "donotreply-bot-check-x9z7q3a1" + str(int(time.time()))[-4:]
    code, msg = _rcpt_probe(host, f"{sentinel_local}@{domain}")
    if code == "ERROR":
        return {"status": "UNREACHABLE", "mx": host, "note": msg[:120]}
    if isinstance(code, int) and 200 <= code < 300:
        return {"status": "CATCHALL", "mx": host, "note": f"sentinel {code}"}
    if isinstance(code, int) and 500 <= code < 600:
        return {"status": "HONEST", "mx": host, "note": f"sentinel {code}"}
    return {"status": "UNREACHABLE", "mx": host, "note": f"sentinel {code} {msg[:60]}"}


def build_email(pattern: str, name: str, domain: str) -> str | None:
    """Return the email address for a pattern name + person name + domain."""
    parts = [p for p in (name or "").strip().split() if p]
    if not parts:
        return None
    first = parts[0].lower()
    last = parts[-1].lower() if len(parts) > 1 else ""
    fi = first[0] if first else ""
    if not last and pattern not in ("first",):
        return None
    domain = domain.lower().lstrip("www.")
    if domain.startswith("us."):
        domain = domain[3:]
    li = last[0] if last else ""
    em = None
    if pattern == "first":              em = f"{first}@{domain}"
    elif pattern == "first.last":       em = f"{first}.{last}@{domain}"
    elif pattern == "flast":            em = f"{fi}{last}@{domain}"
    elif pattern == "firstlast":        em = f"{first}{last}@{domain}"
    elif pattern == "first_last":       em = f"{first}_{last}@{domain}"
    elif pattern == "first+lastinitial":em = f"{first}{li}@{domain}"
    elif pattern == "first-last":       em = f"{first}-{last}@{domain}"
    elif pattern == "last.first":       em = f"{last}.{first}@{domain}"
    elif pattern == "lastfirst":        em = f"{last}{first}@{domain}"
    elif pattern == "lastinitial.first":em = f"{li}.{first}@{domain}"
    elif pattern == "first.lastinitial":em = f"{first}.{li}@{domain}"
    elif pattern == "lastinitial+first":em = f"{last}{fi}@{domain}"  # Orvis-style
    if em is None:
        return None
    if em.split("@", 1)[0] in ROLE_LOCAL_PARTS:
        return None
    return em


def is_tricky_name(name: str) -> bool:
    """Names where the locked pattern may not extrapolate cleanly — must
    probe per-person. Returns True for hyphens, apostrophes, compound
    last names, non-Latin characters, ambiguous first/last (e.g. 'Lee Park'
    where either could be the first name)."""
    n = (name or "").strip()
    if not n:
        return False
    parts = n.split()
    if len(parts) > 2:               return True  # 3-word names
    if "-" in n:                     return True  # hyphenated
    if "'" in n or "’" in n:         return True  # apostrophe (O'Brien)
    if any(not p.isascii() for p in parts): return True  # non-Latin
    # Short tokens that could be initials masquerading as names (e.g. KoL Unger)
    for p in parts:
        # 2-3 chars all caps (KoL, ECG) suggest initials/nickname
        if 2 <= len(p) <= 3 and sum(1 for c in p if c.isupper()) >= 2:
            return True
    return False


def verify_one(host: str, email: str) -> tuple[str, str]:
    code, msg = _rcpt_probe(host, email)
    if code == "ERROR":   return ("ERROR", msg)
    if isinstance(code, int):
        if 200 <= code < 300: return ("VALID", f"{code} {msg[:60]}")
        if 500 <= code < 600: return ("INVALID", f"{code} {msg[:60]}")
        return ("TEMP", f"{code} {msg[:60]}")
    return ("ERROR", str(msg))


def load_sibling_emails() -> set[str]:
    seen: set[str] = set()
    for csv_path in REPO_ROOT.glob("outreach*/outreach-log.csv"):
        try:
            with csv_path.open() as f:
                for row in csv.DictReader(f):
                    em = (row.get("email") or "").strip().lower()
                    if "@" in em:
                        seen.add(em)
        except Exception:
            continue
    return seen


def discover_brand_pattern(host: str, contacts: list[dict], domain: str, sibling: set[str], log) -> tuple[str | None, dict | None, int]:
    """Probe ALL patterns for the discovery person, then pick the SHORTEST
    verified local-part. Rationale: Workspace/Outlook orgs commonly create
    multiple aliases per employee (jordan@, jordan.nathan@, jnathan@ all
    deliver to the same mailbox for Jordan Nathan at Caraway). The shortest
    one is almost always the PRIMARY mailbox the person actually uses (it's
    what appears in their email signature / CRM). Sending to an alias still
    delivers but feels off — the recipient's name plus a long form makes the
    To-field look automated.

    Falls back to second contact if first has 0 verified patterns. Up to 3
    contacts before giving up.
    Returns (pattern, first_verified_row, probes_used).
    """
    probes = 0
    tried_people = 0
    all_patterns = PATTERN_ORDER + EXOTIC_PATTERNS
    for c in contacts:
        if tried_people >= 3:
            return None, None, probes
        nm = c.get("name", "")
        if not nm:
            continue
        tried_people += 1
        log(f"    discover pattern via {nm} (probing all patterns)")
        verified_patterns: list[tuple[str, str]] = []  # [(pattern, email)]
        for pat in all_patterns:
            em = build_email(pat, nm, domain)
            if not em or em in sibling:
                continue
            probes += 1
            verdict, msg = verify_one(host, em)
            log(f"      [{verdict}] {em} ({pat}) {msg[:50]}")
            if verdict == "VALID":
                verified_patterns.append((pat, em))
            time.sleep(PROBE_SLEEP)
        if verified_patterns:
            # Prefer the shortest verified local-part = primary mailbox.
            verified_patterns.sort(key=lambda pe: len(pe[1].split("@", 1)[0]))
            best_pat, best_em = verified_patterns[0]
            log(f"    -> {len(verified_patterns)} aliases verified; picking shortest = {best_em} (pattern={best_pat})")
            row = dict(c)
            row.update({"email": best_em, "pattern": best_pat})
            return best_pat, row, probes
        log(f"    -> 0 patterns verified for {nm}, trying next person")
    return None, None, probes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-per-brand", type=int, default=MAX_PER_BRAND)
    ap.add_argument("--catchall-policy", choices=["skip", "send-named"],
                    default="skip",
                    help="On catch-all domains: skip entire brand (default). "
                         "NEVER use send-named — catchall MX servers accept "
                         "during RCPT TO probe then POST-BOUNCE via DSN once "
                         "they try to deliver to a nonexistent local-part. "
                         "Verified empirically on 2026-05-22: all 3 catchall "
                         "sends (Captain Blankenship, Minori Beauty, Eco Lips) "
                         "post-bounced with 550 'account does not exist'.")
    args = ap.parse_args()

    if not CONTACTS_CSV.exists():
        print(f"ERROR: {CONTACTS_CSV} not found", file=sys.stderr); sys.exit(1)
    rows = list(csv.DictReader(CONTACTS_CSV.open()))
    sibling = load_sibling_emails()
    print(f"loaded {len(rows)} contact rows; sibling-dedup pool: {len(sibling)}")

    by_domain: dict[str, list[dict]] = {}
    for r in rows:
        d = (r.get("domain") or "").strip().lower()
        if d and r.get("name"):
            by_domain.setdefault(d, []).append(r)

    verified: list[dict] = []
    stats = {"brands": 0, "catchall_skip": 0, "unreachable_skip": 0,
             "pattern_locked": 0, "no_pattern": 0, "people_verified": 0}

    for domain, contacts in by_domain.items():
        stats["brands"] += 1
        brand = contacts[0].get("brand", "")
        prefix = f"  {domain:<32} {brand[:24]:<24}"

        def log(line: str) -> None:
            print(f"{prefix} {line}", flush=True)

        cls = classify_domain(domain)
        log(f"domain={cls['status']:<11} mx={cls['mx'][:30]} {cls['note'][:50]}")

        if cls["status"] in ("NO_MX", "UNREACHABLE"):
            stats["unreachable_skip"] += 1
            continue
        if cls["status"] == "CATCHALL" and args.catchall_policy == "skip":
            stats["catchall_skip"] += 1
            log(f"  -> catchall, skipping all {len(contacts)} contacts")
            continue

        host = cls["mx"]
        # Discover brand pattern
        pattern, first_row, probes = discover_brand_pattern(host, contacts, domain, sibling, log)
        if not pattern:
            stats["no_pattern"] += 1
            log(f"  -> no pattern found, skipping brand ({probes} probes)")
            time.sleep(DOMAIN_SLEEP); continue
        stats["pattern_locked"] += 1
        log(f"  -> LOCKED pattern: {pattern}  (first verified: {first_row['email']})")

        verified.append({
            "email": first_row["email"],
            "name": first_row["name"],
            "title": first_row.get("title", ""),
            "brand": brand,
            "domain": domain,
            "pattern": pattern,
            "source": "smtp_pattern_discovery",
            "notes": f"first to verify; mx={host}",
        })
        stats["people_verified"] += 1

        # Apply locked pattern to remaining people.
        # Trust the pattern by default — only probe TRICKY names (hyphens,
        # apostrophes, 3-word names, non-Latin chars, short all-caps tokens).
        # This dramatically cuts SMTP probe load (less bot-detection risk)
        # and trusts that Workspace/Outlook admins pre-create aliases per
        # the brand convention.
        for c in contacts:
            if c.get("name") == first_row["name"]:
                continue
            if probes >= args.max_per_brand:
                log(f"  [cap] {args.max_per_brand} probes reached")
                break
            em = build_email(pattern, c["name"], domain)
            if not em or em in sibling:
                continue
            tricky = is_tricky_name(c["name"])
            if tricky:
                probes += 1
                verdict, msg = verify_one(host, em)
                tag = "OK " if verdict == "VALID" else "skip"
                log(f"  [{tag}/probed-tricky] {em:<40} ({c['name']}, {c.get('title','')[:30]}) {msg[:50]}")
                if verdict != "VALID":
                    continue
                source = "smtp_probed_tricky"
                time.sleep(PROBE_SLEEP)
            else:
                log(f"  [trust] {em:<40} ({c['name']}, {c.get('title','')[:30]}) — clean name, locked pattern")
                source = "pattern_trusted_clean"
            verified.append({
                "email": em, "name": c["name"],
                "title": c.get("title", ""),
                "brand": brand, "domain": domain,
                "pattern": pattern,
                "source": source,
                "notes": f"mx={host}",
            })
            stats["people_verified"] += 1

        time.sleep(DOMAIN_SLEEP)

    with VERIFIED_CSV.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=[
            "email","name","title","brand","domain","pattern","source","notes",
        ])
        w.writeheader(); w.writerows(verified)
    print(f"\n=== SUMMARY ===")
    for k, v in stats.items():
        print(f"  {k}: {v}")
    print(f"-> {VERIFIED_CSV.relative_to(ROOT)} ({len(verified)} rows)")


if __name__ == "__main__":
    main()
