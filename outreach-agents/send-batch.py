#!/usr/bin/env python3
"""Send the agent-API pitch to a shopping-agent company batch.

Reads <batch>.csv (after scrape), filters to rows with a real scraped email
(email_source starts with 'https://'), sends each via `gog gmail send`, and
appends the send to outreach-log.csv.

Forked from outreach/send-batch.py — different template, no platform mirror,
separate log file. Dedupe key is the normalized company name.

Stdout is summary-only. Per-row detail goes to logs/send-<batch-stem>.log.
"""
import csv
import json
import os
import random
import re
import subprocess
import sys
import time
from datetime import date
from pathlib import Path

ROOT = Path(__file__).parent
LOG_DIR = ROOT / "logs"
_args = [a for a in sys.argv[1:] if not a.startswith("--")]
IN_CSV = Path(_args[0]) if _args else (ROOT / "batch.csv")
LOG_CSV = ROOT / "outreach-log.csv"
VERBOSE = "--verbose" in sys.argv or "-v" in sys.argv
DRY_RUN = "--dry-run" in sys.argv
GMAIL_ID_RE = re.compile(r"\b([0-9a-f]{16,})\b")

ACCOUNT = os.environ.get("GOG_ACCOUNT", "armaanp4423@gmail.com")

SUBJECT_TMPL = "Stanford/Dartmouth Student Inquiry"
BODY_TMPL = """Hi,

We are Stanford/Dartmouth students building data infrastructure for people to trust agents with purchases. We've established a network of humans who evaluate products and are turning the results into structured, queryable data for agentic commerce solutions.

Curious if this could be useful for what {company} is building. Would you be open to chat?

Thanks,
Armaan
"""


def normalize_company(raw: str) -> str:
    """Light normalization — strip whitespace, collapse internal spaces.

    Unlike the brand pipeline we don't title-case all-caps tokens because
    company brand styles (OpenAI, BRM, x402, JAGGAER) are intentional.
    """
    return re.sub(r"\s+", " ", raw.strip())


def send_one(
    company_raw: str, email: str, *, dry_run: bool
) -> tuple[bool, str, str, str | None]:
    """Send one email via gog. Returns (ok, info, body, external_id)."""
    company = normalize_company(company_raw)
    subject = SUBJECT_TMPL
    body = BODY_TMPL.format(company=company)
    cmd = [
        "gog", "--account", ACCOUNT, "gmail", "send",
        "--to", email,
        "--subject", subject,
        "--body", body,
    ]
    if dry_run:
        cmd.append("--dry-run")
    env = os.environ.copy()
    if "GOG_KEYRING_PASSWORD" not in env:
        print("ERROR: GOG_KEYRING_PASSWORD not set", file=sys.stderr)
        sys.exit(1)
    try:
        r = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=60)
        if r.returncode == 0:
            stdout = r.stdout.strip() or "ok"
            return True, stdout, body, _parse_gmail_id(stdout)
        return False, (r.stderr.strip() or f"rc={r.returncode}"), body, None
    except Exception as e:
        return False, f"{type(e).__name__}: {e}", body, None


def _parse_gmail_id(stdout: str) -> str | None:
    s = stdout.strip()
    if not s:
        return None
    try:
        data = json.loads(s)
    except json.JSONDecodeError:
        data = None
    if isinstance(data, dict):
        for key in ("id", "messageId", "message_id", "gmail_id"):
            v = data.get(key)
            if isinstance(v, str) and v:
                return v
        msg = data.get("message")
        if isinstance(msg, dict):
            v = msg.get("id")
            if isinstance(v, str) and v:
                return v
    m = GMAIL_ID_RE.search(s)
    return m.group(1) if m else None


def append_log(row: dict) -> None:
    fieldnames = ["name", "role", "company", "domain", "category", "email", "date_sent", "verified", "notes"]
    new_file = not LOG_CSV.exists()
    with LOG_CSV.open("a", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        if new_file:
            w.writeheader()
        w.writerow({k: row.get(k, "") for k in fieldnames})


def _dedup_key(raw: str) -> str:
    return normalize_company(raw).strip().lower()


def load_already_sent() -> set[str]:
    if not LOG_CSV.exists():
        return set()
    return {_dedup_key(r.get("company") or "") for r in csv.DictReader(LOG_CSV.open()) if (r.get("company") or "").strip()}


def main():
    dry = DRY_RUN
    with IN_CSV.open() as f:
        rows = list(csv.DictReader(f))
    already = load_already_sent()
    real = [r for r in rows if r.get("email_source", "").startswith("https://")]
    targets = [r for r in real if _dedup_key(r.get("company") or "") not in already]
    skipped_dup = len(real) - len(targets)

    LOG_DIR.mkdir(exist_ok=True)
    log_path = LOG_DIR / f"send-{IN_CSV.stem}.log"
    log_f = log_path.open("w")

    def log(line: str) -> None:
        log_f.write(line + "\n")
        log_f.flush()
        if VERBOSE:
            print(line, flush=True)

    dry_tag = " (DRY RUN)" if dry else ""
    log(f"account={ACCOUNT} targets={len(targets)} skipped_dup={skipped_dup}{dry_tag}")
    sent = failed = 0
    failures: list[tuple[str, str]] = []
    for i, r in enumerate(targets, 1):
        company_raw = r.get("company") or r.get("domain", "")
        email = r["email"]
        name_raw = r.get("name") or ""
        ok, info, body, external_id = send_one(company_raw, email, dry_run=dry)
        status = "OK " if ok else "FAIL"
        id_tag = f" id={external_id}" if external_id else ""
        log(f"[{i:>2}/{len(targets)}] {status} {company_raw:<32} {email:<40} {info}{id_tag}")
        if ok:
            sent += 1
            if not dry:
                append_log({
                    "name": name_raw,
                    "role": r.get("role", ""),
                    "company": company_raw,
                    "domain": r.get("domain", ""),
                    "category": r.get("category", ""),
                    "email": email,
                    "date_sent": date.today().isoformat(),
                    "verified": "sent",
                    "notes": r.get("notes", ""),
                })
        else:
            failed += 1
            failures.append((company_raw, info[:80]))
        if i < len(targets) and not dry:
            time.sleep(random.uniform(3.0, 8.0))
    log_f.close()
    print(
        f"sent={sent} failed={failed} skipped_dup={skipped_dup} "
        f"log={log_path.relative_to(ROOT)}{dry_tag}"
    )
    for company, info in failures[:3]:
        print(f"  fail: {company} — {info}")


if __name__ == "__main__":
    main()
