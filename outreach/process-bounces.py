#!/usr/bin/env python3
"""Mark bounced sends as BOUNCED in outreach-log.csv and trash the DSNs.

Searches the sender account for mailer-daemon messages, parses
X-Failed-Recipients from each, joins against outreach-log.csv, updates
matching rows' `verified` column to BOUNCED, then trashes the DSNs.

Stdout is summary-only. Per-row detail goes to logs/bounces-<date>.log.
"""
import argparse
import csv
import json
import os
import re
import subprocess
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).parent
LOG_CSV = ROOT / "outreach-log.csv"
LOG_DIR = ROOT / "logs"

FAILED_RCPT_RE = re.compile(r"^X-Failed-Recipients:\s*(.+)$", re.IGNORECASE | re.MULTILINE)
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")


def run(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True, timeout=60)


def search_dsn_ids(account: str, since: str) -> list[str]:
    cmd = [
        "gog", "--account", account, "gmail", "messages", "search",
        f"from:mailer-daemon@googlemail.com newer_than:{since}",
        "--json", "--all", "--max", "500",
    ]
    r = run(cmd)
    if r.returncode != 0:
        raise RuntimeError(f"search failed: {r.stderr.strip()}")
    try:
        data = json.loads(r.stdout)
    except json.JSONDecodeError:
        return []
    # gog returns either a list or an envelope with 'messages'/'results'
    msgs = data if isinstance(data, list) else (
        data.get("messages") or data.get("results") or data.get("items") or []
    )
    ids = []
    for m in msgs:
        mid = m.get("id") if isinstance(m, dict) else None
        if mid:
            ids.append(mid)
    return ids


def extract_failed_recipient(account: str, mid: str) -> str | None:
    cmd = ["gog", "--account", account, "gmail", "get", mid, "--format", "raw", "--json"]
    r = run(cmd)
    if r.returncode != 0:
        return None
    try:
        data = json.loads(r.stdout)
    except json.JSONDecodeError:
        return None
    raw = data.get("raw") if isinstance(data, dict) else None
    if not raw:
        return None
    # raw is typically base64url-encoded RFC-822. Try decoding.
    import base64
    try:
        decoded = base64.urlsafe_b64decode(raw + "==").decode("utf-8", errors="ignore")
    except Exception:
        decoded = raw
    m = FAILED_RCPT_RE.search(decoded)
    if m:
        em = EMAIL_RE.search(m.group(1))
        if em:
            return em.group(0).lower()
    return None


def mark_bounced(emails: set[str]) -> int:
    if not LOG_CSV.exists() or not emails:
        return 0
    rows = list(csv.DictReader(LOG_CSV.open()))
    fieldnames = rows[0].keys() if rows else ["name", "role", "brand", "domain", "email", "date_sent", "verified", "llm_evidence"]
    updated = 0
    for row in rows:
        em = (row.get("email") or "").strip().lower()
        if em and em in emails and row.get("verified") != "BOUNCED":
            row["verified"] = "BOUNCED"
            updated += 1
    if updated:
        with LOG_CSV.open("w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=list(fieldnames))
            w.writeheader()
            w.writerows(rows)
    return updated


def trash_dsns(account: str, since: str, dry: bool) -> int:
    cmd = [
        "gog", "--account", account, "gmail", "trash",
        "--query", f"from:mailer-daemon newer_than:{since}",
        "--max", "500",
    ]
    if dry:
        cmd.append("--dry-run")
    else:
        cmd.append("-y")
    r = run(cmd)
    if r.returncode != 0:
        return 0
    # best-effort count: gog prints "trashed N" or one id per line
    out = (r.stdout or "") + (r.stderr or "")
    m = re.search(r"trashed[:\s]+(\d+)", out, re.IGNORECASE)
    if m:
        return int(m.group(1))
    return len([ln for ln in out.splitlines() if ln.strip()])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--account", default=os.environ.get("GOG_ACCOUNT"))
    ap.add_argument("--since", default="1h", help="Gmail newer_than: window (e.g. 30m, 1h, 2d)")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("-v", "--verbose", action="store_true")
    args = ap.parse_args()

    if not args.account:
        print("ERROR: --account or GOG_ACCOUNT required", file=sys.stderr)
        sys.exit(1)

    LOG_DIR.mkdir(exist_ok=True)
    log_path = LOG_DIR / f"bounces-{date.today().isoformat()}.log"
    log_f = log_path.open("a")

    def log(line: str) -> None:
        log_f.write(line + "\n")
        log_f.flush()
        if args.verbose:
            print(line, flush=True)

    log(f"account={args.account} since={args.since} dry={args.dry_run}")

    try:
        ids = search_dsn_ids(args.account, args.since)
    except Exception as e:
        print(f"search failed: {e}", file=sys.stderr)
        sys.exit(2)

    log(f"found {len(ids)} DSN messages")
    bounced_emails: set[str] = set()
    for mid in ids:
        em = extract_failed_recipient(args.account, mid)
        if em:
            bounced_emails.add(em)
            log(f"  bounce: {mid} -> {em}")
        else:
            log(f"  bounce: {mid} -> (no X-Failed-Recipients)")

    if args.dry_run:
        updated = 0
        trashed = 0
    else:
        updated = mark_bounced(bounced_emails)
        trashed = trash_dsns(args.account, args.since, dry=False)

    log_f.close()
    dry_tag = " (DRY RUN)" if args.dry_run else ""
    print(
        f"dsns={len(ids)} bounced_emails={len(bounced_emails)} "
        f"log_updated={updated} trashed={trashed} log={log_path.relative_to(ROOT)}{dry_tag}"
    )


if __name__ == "__main__":
    main()
