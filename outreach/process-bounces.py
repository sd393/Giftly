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
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import giftly_api

ROOT = Path(__file__).parent
LOG_CSV = ROOT / "outreach-log.csv"
LOG_DIR = ROOT / "logs"

FAILED_RCPT_RE = re.compile(r"^X-Failed-Recipients:\s*(.+)$", re.IGNORECASE | re.MULTILINE)
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")


def run(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True, timeout=60)


def search_dsn_ids(account: str, query: str) -> list[str]:
    cmd = [
        "gog", "--account", account, "gmail", "messages", "search",
        query,
        "--json", "--all", "--max", "500",
    ]
    r = run(cmd)
    if r.returncode != 0:
        raise RuntimeError(f"search failed: {r.stderr.strip()}")
    try:
        data = json.loads(r.stdout)
    except json.JSONDecodeError:
        return []
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
    # gog nests raw under message.raw; fall back to top-level for safety
    raw = None
    if isinstance(data, dict):
        msg = data.get("message")
        if isinstance(msg, dict):
            raw = msg.get("raw")
        raw = raw or data.get("raw")
    if not raw:
        return None
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
    ap.add_argument("--query", help="Override the Gmail search query (otherwise: from:mailer-daemon@googlemail.com newer_than:<since>)")
    ap.add_argument("--no-trash", action="store_true", help="Skip trashing DSNs (recovery runs on trashed messages)")
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

    query = args.query or f"from:mailer-daemon@googlemail.com newer_than:{args.since}"
    log(f"account={args.account} query={query!r} dry={args.dry_run} no_trash={args.no_trash}")

    try:
        ids = search_dsn_ids(args.account, query)
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

    api_patched = 0
    api_failed = 0
    if args.dry_run:
        updated = 0
        trashed = 0
    else:
        updated = mark_bounced(bounced_emails)
        if args.no_trash or args.query:
            trashed = 0
        else:
            trashed = trash_dsns(args.account, args.since, dry=False)

        if giftly_api.is_configured() and bounced_emails:
            since_iso = _cutoff_iso(args.since)
            for em in bounced_emails:
                ok, detail = _patch_bounces_for_email(em, since_iso=since_iso)
                if ok is None:
                    log(f"  api {em}: no matching brand/messages")
                elif ok:
                    api_patched += detail
                    log(f"  api {em}: marked {detail} message(s) bounced")
                else:
                    api_failed += 1
                    log(f"  api {em}: {detail}")

    log_f.close()
    dry_tag = " (DRY RUN)" if args.dry_run else ""
    api_tag = (
        f" api_patched={api_patched}" + (f" api_failed={api_failed}" if api_failed else "")
        if giftly_api.is_configured()
        else ""
    )
    print(
        f"dsns={len(ids)} bounced_emails={len(bounced_emails)} "
        f"log_updated={updated} trashed={trashed}{api_tag} "
        f"log={log_path.relative_to(ROOT)}{dry_tag}"
    )


def _cutoff_iso(since: str) -> str:
    """Convert a gmail-style newer_than token (e.g. 30m, 1h, 2d) into an
    ISO-8601 cutoff. Fall back to 24h if the token is unrecognizable."""
    m = re.match(r"^\s*(\d+)\s*([mhd])\s*$", since)
    if m:
        n, unit = int(m.group(1)), m.group(2)
        delta = {
            "m": timedelta(minutes=n),
            "h": timedelta(hours=n),
            "d": timedelta(days=n),
        }[unit]
    else:
        delta = timedelta(days=1)
    # Widen the cutoff a bit — DSNs sometimes arrive slightly after the batch
    # window closes. 2x plus 10 minutes is a cheap safety net.
    widened = delta * 2 + timedelta(minutes=10)
    return (datetime.now(timezone.utc) - widened).isoformat().replace("+00:00", "Z")


def _patch_bounces_for_email(email: str, *, since_iso: str) -> tuple[bool | None, int | str]:
    """Mark every recent sent message to this recipient as bounced.

    Returns (ok, detail):
      - (None, "no match") if we can't resolve the email to a brand/message
      - (True, count) if at least one message was patched
      - (False, error) on API failure
    """
    try:
        brand = giftly_api.find_brand_by_contact_email(email)
    except giftly_api.ApiError as e:
        return False, f"brand lookup: {e}"
    if not brand:
        return None, "no match"
    try:
        messages = giftly_api.list_recent_sent_messages_for_brand(
            brand["id"], since_iso=since_iso, limit=50
        )
    except giftly_api.ApiError as e:
        return False, f"message lookup: {e}"

    # If there's no scraped contact_email on the message metadata, still patch
    # the most recent sent message to this brand — it's the only plausible one.
    candidates = []
    for m in messages:
        meta_email = (m.get("metadata") or {}).get("contact_email")
        if meta_email and meta_email.lower() != email.lower():
            continue
        candidates.append(m)

    patched = 0
    for m in candidates:
        try:
            giftly_api.patch_message_status(m["id"], "bounced")
            patched += 1
        except giftly_api.ApiError as e:
            return False, f"patch {m['id']}: {e}"
    if patched == 0:
        return None, "no match"
    return True, patched


if __name__ == "__main__":
    main()
