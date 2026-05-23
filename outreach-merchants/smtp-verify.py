#!/usr/bin/env python3
"""Self-hosted SMTP RCPT TO verifier — Hunter fallback / replacement.

For each candidate email, does a partial SMTP conversation against the
recipient domain's MX server up to RCPT TO, reads the response code:
  250 -> mailbox accepted
  550 -> mailbox rejected (does not exist)
  4xx -> temporary failure / greylisting
  ERROR -> connection refused, timeout, etc.

Critical: detects catch-all domains by probing a sentinel nonsense
local-part FIRST. If the sentinel gets 250, the domain accepts
anything, so RCPT TO probing can't tell us if a specific address
actually exists — we flag those as CATCHALL and the caller decides
what to do (typically: send only to explicit role addresses on those
domains, since those are read by real humans regardless).

Requires outbound port 25. Many residential ISPs block this; check
first with: nc -zv gmail-smtp-in.l.google.com 25

Input:  contacts.csv (same schema as discover-contacts.py output) OR
        a single email on the CLI: `python3 smtp-verify.py user@domain.com`
Output: verified.csv (same schema as verify-emails.py output)
"""
import argparse
import csv
import os
import smtplib
import socket
import string
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
PROBE_SLEEP = 0.5  # short sleep between RCPT TO calls to same MX
DOMAIN_SLEEP = 1.5  # sleep between domains


def mx_lookup(domain: str) -> list[tuple[int, str]]:
    """Return [(priority, host)] sorted by priority, via /usr/bin/dig."""
    try:
        r = subprocess.run(
            ["dig", "+short", "MX", domain],
            capture_output=True, text=True, timeout=10,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return []
    records = []
    for line in r.stdout.strip().splitlines():
        parts = line.split()
        if len(parts) >= 2:
            try:
                pri = int(parts[0])
                host = parts[1].rstrip(".")
                records.append((pri, host))
            except ValueError:
                pass
    records.sort()
    return records


def _rcpt_probe(host: str, email: str) -> tuple[str | int, str]:
    """One RCPT TO attempt. Returns (code, message). code is int or 'ERROR'."""
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
    """One-time per-domain probe. Returns:
       {status: HONEST|CATCHALL|UNREACHABLE|NO_MX, mx: str, note: str}
    """
    mxs = mx_lookup(domain)
    if not mxs:
        return {"status": "NO_MX", "mx": "", "note": "no MX records"}
    host = mxs[0][1]
    # Sentinel local-part: random-looking string unlikely to exist anywhere
    sentinel_local = "donotreply-bot-check-x9z7q3a1" + str(int(time.time()))[-4:]
    sentinel = f"{sentinel_local}@{domain}"
    code, msg = _rcpt_probe(host, sentinel)
    if code == "ERROR":
        return {"status": "UNREACHABLE", "mx": host, "note": msg[:120]}
    if isinstance(code, int) and 200 <= code < 300:
        # Sentinel was accepted -> catch-all
        return {"status": "CATCHALL", "mx": host, "note": f"sentinel {code}"}
    if isinstance(code, int) and 500 <= code < 600:
        # Sentinel rejected -> server honestly rejects unknown addrs
        return {"status": "HONEST", "mx": host, "note": f"sentinel {code}"}
    # 4xx, etc.
    return {"status": "UNREACHABLE", "mx": host, "note": f"sentinel {code} {msg[:60]}"}


def verify_email(email: str, host: str) -> tuple[str, str]:
    """Verify one email against a known-honest MX. Returns (verdict, raw_msg).
    Verdict: VALID|INVALID|TEMP|ERROR.
    """
    code, msg = _rcpt_probe(host, email)
    if code == "ERROR":
        return ("ERROR", msg)
    if isinstance(code, int):
        if 200 <= code < 300:
            return ("VALID", f"{code} {msg[:80]}")
        if 500 <= code < 600:
            return ("INVALID", f"{code} {msg[:80]}")
        return ("TEMP", f"{code} {msg[:80]}")
    return ("ERROR", str(msg))


def load_sibling_emails() -> set[str]:
    """Lowercased emails we've sent to in any sibling campaign log."""
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


# Same pattern logic as verify-emails.py (Hunter version) — kept in
# sync so swapping verifiers doesn't change candidate ordering.
def name_pattern_candidates(name: str, domain: str) -> list[str]:
    name = (name or "").strip()
    if not name:
        return []
    parts = [p for p in name.split() if p]
    if not parts:
        return []
    first = parts[0].lower()
    last = parts[-1].lower() if len(parts) > 1 else ""
    fi = first[0]
    domain = domain.lower().lstrip("www.")
    if domain.startswith("us."):
        domain = domain[3:]
    cands = [f"{first}@{domain}"]
    if last:
        cands += [
            f"{first}.{last}@{domain}",
            f"{fi}{last}@{domain}",
            f"{first}{last}@{domain}",
            f"{first}_{last}@{domain}",
        ]
    seen, out = set(), []
    for c in cands:
        if c not in seen:
            seen.add(c); out.append(c)
    return out


# v1.1 named-only playbook: drop ALL role-shaped local parts, even if
# the SMTP probe says deliverable. Role mailboxes route to customer-service
# contractors, not the senior people we're pitching.
HARD_BLOCK_LOCAL = {
    "info","hello","contact","contactus","help","support","feedback",
    "office","mail","email","general","main",
    "press","media","pr","news","blog","social","content",
    "marketing","brand","advertising","ads",
    "sales","partnerships","partner","partners","biz","business",
    "wholesale","trade","retail","b2b","enterprise",
    "enquiries","enquiry","inquiry","inquiries","leads",
    "orders","order","service","customerservice","customer","cs",
    "returns","shipping","fulfillment","logistics",
    "billing","ap","ar","accounts","account","accounting","finance",
    "admin","operations","ops",
    "hr","jobs","careers","recruiting","talent","apply",
    "noreply","no-reply","donotreply","do-not-reply","reply",
    "webmaster","postmaster","root","abuse","security","privacy","legal",
    "web","www",
    "all","everyone","staff","team",
    "hi","hey","hola","yo",
    "store","shop",
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "single_email", nargs="?",
        help="Verify a single email instead of running over contacts.csv",
    )
    ap.add_argument(
        "--max-per-domain", type=int, default=5,
        help="Cap RCPT TO calls per domain (default 5).",
    )
    ap.add_argument(
        "--catchall-policy", choices=["drop", "keep-explicit"],
        default="keep-explicit",
        help="On catch-all domains: 'drop' all candidates, or "
             "'keep-explicit' (keep explicit on-site emails like info@/hello@, "
             "drop guessed ones). Default keep-explicit.",
    )
    args = ap.parse_args()

    if args.single_email:
        em = args.single_email.strip().lower()
        _, _, dom = em.rpartition("@")
        cls = classify_domain(dom)
        print(f"domain={dom} {cls}")
        if cls["status"] in ("HONEST", "CATCHALL"):
            verdict, msg = verify_email(em, cls["mx"])
            print(f"verify={verdict} msg={msg}")
        return

    if not CONTACTS_CSV.exists():
        print(f"ERROR: {CONTACTS_CSV} not found", file=sys.stderr)
        sys.exit(1)

    contacts = list(csv.DictReader(CONTACTS_CSV.open()))
    sibling = load_sibling_emails()
    print(f"loaded {len(contacts)} contact rows; sibling-dedup pool: {len(sibling)}")

    # Group by domain so we can classify each domain once.
    by_domain: dict[str, list[dict]] = {}
    for r in contacts:
        d = (r.get("domain") or "").strip().lower()
        if d:
            by_domain.setdefault(d, []).append(r)

    verified: list[dict] = []
    domain_classes: dict[str, dict] = {}
    dropped_sibling = dropped_role = dropped_invalid = 0
    dropped_catchall = dropped_unreachable = 0

    for domain, rows in by_domain.items():
        brand = rows[0].get("brand", "")
        cls = classify_domain(domain)
        domain_classes[domain] = cls
        prefix = f"  {domain:<28} {brand[:24]:<24}"
        print(f"{prefix} domain={cls['status']:<11} mx={cls['mx'][:30]:<30} {cls['note'][:50]}")

        if cls["status"] in ("NO_MX", "UNREACHABLE"):
            dropped_unreachable += len([r for r in rows if r.get("candidate_email") or r.get("name")])
            continue

        # Build candidates: explicit (from site) and guessed (from name)
        candidates: list[tuple[str, str, str]] = []  # (email, name, source)
        for r in rows:
            ex = (r.get("candidate_email") or "").strip().lower()
            if ex:
                local = ex.split("@", 1)[0]
                if local in HARD_BLOCK_LOCAL:
                    dropped_role += 1
                    continue
                candidates.append((ex, r.get("name", ""), "explicit"))
            elif r.get("name"):
                for guess in name_pattern_candidates(r["name"], domain):
                    candidates.append((guess, r["name"], "guessed"))
        # Per-domain dedup
        seen_in_dom = set(); dedup = []
        for c in candidates:
            if c[0] not in seen_in_dom:
                seen_in_dom.add(c[0]); dedup.append(c)
        # Sibling dedup
        filtered = []
        for em, nm, src in dedup:
            if em in sibling:
                dropped_sibling += 1; continue
            filtered.append((em, nm, src))

        # On catch-all domains, the RCPT TO probe lies. Apply policy.
        if cls["status"] == "CATCHALL":
            if args.catchall_policy == "drop":
                dropped_catchall += len(filtered)
                continue
            # keep-explicit: keep explicit on-site emails as-is (these are
            # real role mailboxes humans monitor), drop guessed ones.
            kept_explicit = [c for c in filtered if c[2] == "explicit"]
            dropped_catchall += len(filtered) - len(kept_explicit)
            for em, nm, src in kept_explicit:
                verified.append({
                    "email": em, "name": nm, "brand": brand, "domain": domain,
                    "hunter_score": "", "hunter_status": "smtp_catchall_explicit",
                    "source": src,
                    "notes": f"catchall-domain explicit-onsite-address mx={cls['mx']}",
                })
            continue

        # HONEST domain: probe each candidate up to the cap.
        calls = 0
        found_one = False
        for em, nm, src in filtered:
            if calls >= args.max_per_domain:
                print(f"{prefix} [cap] {args.max_per_domain} calls, moving on")
                break
            calls += 1
            verdict, msg = verify_email(em, cls["mx"])
            tag = "OK " if verdict == "VALID" else "skip"
            print(f"{prefix} [{tag}] {em:<40} verdict={verdict} {msg[:60]}")
            if verdict == "VALID":
                verified.append({
                    "email": em, "name": nm, "brand": brand, "domain": domain,
                    "hunter_score": "", "hunter_status": "smtp_valid",
                    "source": src,
                    "notes": f"smtp-rcpt verified mx={cls['mx']}",
                })
                found_one = True
                break
            elif verdict == "INVALID":
                dropped_invalid += 1
            time.sleep(PROBE_SLEEP)
        if not found_one and calls and args.catchall_policy:
            pass  # already handled
        time.sleep(DOMAIN_SLEEP)

    with VERIFIED_CSV.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=[
            "email", "name", "brand", "domain",
            "hunter_score", "hunter_status", "source", "notes",
        ])
        w.writeheader()
        w.writerows(verified)
    print(
        f"\nverified={len(verified)} "
        f"dropped(sibling={dropped_sibling} role={dropped_role} "
        f"invalid={dropped_invalid} catchall={dropped_catchall} "
        f"unreachable={dropped_unreachable}) -> {VERIFIED_CSV.relative_to(ROOT)}"
    )


if __name__ == "__main__":
    main()
