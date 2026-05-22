#!/usr/bin/env python3
"""Send the mid-size retailer pitch to a manually-curated batch.

Reads <batch>.csv (must have an `email` column; other columns optional and
preserved into the log), dedupes against outreach-log.csv by normalized
email, sends each via `gog gmail send`, and appends the send to the log.

Forked from outreach-brands-audit/send-batch.py — same no-scrape
architecture (input emails are trusted as provided), separate log file.
Different audience: multi-brand retailers / marketplaces (Nordstrom,
Verishop, Goop scale) instead of single-brand DTC.

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
EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")

ACCOUNT = os.environ.get("GOG_ACCOUNT", "armaan.priyadarshan.29@dartmouth.edu")

CC_RECIPIENTS = (
    "samarjit.deshmukh.29@dartmouth.edu",
    "ethanpzhou@berkeley.edu",
    "shamitd@stanford.edu",
)

SUBJECT_TMPL = "Stanford Student Question - thoughts on AI retail tools"

# Body uses {name} and {company} placeholders, filled by render_body().
# Fallbacks: missing name -> "Hi,"; missing company -> "your company".
BODY_TMPL = """Hi{name_suffix},

We're Stanford/Dartmouth students curious how {company} is thinking about AI, given 50 million people now shop with ChatGPT daily.

Would you be open to a quick 10-minute call?

If not, we would appreciate even a one-sentence response with your thoughts on how retailers are improving their visibility with AI.

Thanks,
Armaan
"""
BODY_HTML_TMPL = """<p style="margin-top:0">Hi{name_suffix},</p>
<p>We're Stanford/Dartmouth students curious how {company} is thinking about AI, given 50 million people now shop with ChatGPT daily.</p>
<p>Would you be open to a quick 10-minute call?</p>
<p>If not, we would appreciate even a one-sentence response with your thoughts on how retailers are improving their visibility with AI.</p>
<p>Thanks,<br>Armaan</p>
"""


def render_body(name: str = "", company: str = "") -> tuple[str, str]:
    """Return (plain, html) bodies with {name}/{company} substituted.

    - Empty name -> greeting collapses to 'Hi,' (no trailing space).
    - Empty company -> 'your company'.
    """
    first = (name or "").strip().split()[0] if (name or "").strip() else ""
    name_suffix = f" {first}" if first else ""
    co = (company or "").strip() or "your company"
    return (
        BODY_TMPL.format(name_suffix=name_suffix, company=co),
        BODY_HTML_TMPL.format(name_suffix=name_suffix, company=co),
    )

# Follow-up template for second-touch outreach. Use the ORIGINAL subject line
# the recipient received (so gmail threads it) — not a new subject.
FOLLOWUP_BODY_TMPL = """Hi,

Just wanted to follow up in case this message got lost in your inbox. We're working with brands valued over $300M+ and leading AI shopping platforms.

Would love to schedule a quick chat to discuss how retailers, marketplaces and brands are approaching agentic commerce.

Thanks,
Armaan
"""
FOLLOWUP_BODY_HTML_TMPL = """<p>Hi,</p>
<p>Just wanted to follow up in case this message got lost in your inbox. We're working with brands valued over $300M+ and leading AI shopping platforms.</p>
<p>Would love to schedule a quick chat to discuss how retailers, marketplaces and brands are approaching agentic commerce.</p>
<p>Thanks,<br>Armaan</p>
"""


def _dedup_key(raw: str) -> str:
    return (raw or "").strip().lower()


def send_one(
    email: str,
    *,
    dry_run: bool,
    name: str = "",
    company: str = "",
) -> tuple[bool, str, str, str | None]:
    """Send one email via gog. Returns (ok, info, body, external_id).

    `name` and `company` populate the body's {name}/{company} placeholders.
    Empty values fall back gracefully (see render_body).
    """
    subject = SUBJECT_TMPL
    body, body_html = render_body(name=name, company=company)
    cmd = [
        "gog", "--account", ACCOUNT, "gmail", "send",
        "--to", email,
        "--cc", ",".join(CC_RECIPIENTS),
        "--subject", subject,
        "--body", body,
        "--body-html", body_html,
    ]
    if dry_run:
        cmd.append("--dry-run")
    env = os.environ.copy()
    if not dry_run and "GOG_KEYRING_PASSWORD" not in env:
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
    fieldnames = ["name", "retailer", "email", "date_sent", "verified", "notes"]
    new_file = not LOG_CSV.exists()
    with LOG_CSV.open("a", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        if new_file:
            w.writeheader()
        w.writerow({k: row.get(k, "") for k in fieldnames})


def load_already_sent() -> set[str]:
    """Email addresses we've already sent to (any status, including BOUNCED)."""
    if not LOG_CSV.exists():
        return set()
    return {
        _dedup_key(r.get("email") or "")
        for r in csv.DictReader(LOG_CSV.open())
        if (r.get("email") or "").strip()
    }


def main():
    dry = DRY_RUN
    if not IN_CSV.exists():
        print(f"ERROR: input CSV not found: {IN_CSV}", file=sys.stderr)
        sys.exit(1)
    with IN_CSV.open() as f:
        rows = list(csv.DictReader(f))
    already = load_already_sent()

    has_email = [r for r in rows if (r.get("email") or "").strip()]
    skipped_no_email = len(rows) - len(has_email)
    valid = [r for r in has_email if EMAIL_RE.match(r["email"].strip())]
    skipped_invalid = len(has_email) - len(valid)
    targets: list[dict] = []
    seen_in_batch: set[str] = set()
    for r in valid:
        key = _dedup_key(r["email"])
        if key in already or key in seen_in_batch:
            continue
        seen_in_batch.add(key)
        targets.append(r)
    skipped_dup = len(valid) - len(targets)

    LOG_DIR.mkdir(exist_ok=True)
    log_path = LOG_DIR / f"send-{IN_CSV.stem}.log"
    log_f = log_path.open("w")

    def log(line: str) -> None:
        log_f.write(line + "\n")
        log_f.flush()
        if VERBOSE:
            print(line, flush=True)

    dry_tag = " (DRY RUN)" if dry else ""
    log(
        f"account={ACCOUNT} targets={len(targets)} "
        f"skipped_dup={skipped_dup} skipped_invalid={skipped_invalid} "
        f"skipped_no_email={skipped_no_email}{dry_tag}"
    )
    sent = failed = 0
    failures: list[tuple[str, str]] = []
    for i, r in enumerate(targets, 1):
        email = r["email"].strip()
        name_raw = r.get("name") or ""
        retailer_raw = r.get("retailer") or r.get("brand") or ""
        ok, info, body, external_id = send_one(
            email, dry_run=dry, name=name_raw, company=retailer_raw,
        )
        status = "OK " if ok else "FAIL"
        id_tag = f" id={external_id}" if external_id else ""
        label = retailer_raw or name_raw or "-"
        log(f"[{i:>2}/{len(targets)}] {status} {label:<24} {email:<40} {info}{id_tag}")
        if ok:
            sent += 1
            if not dry:
                append_log({
                    "name": name_raw,
                    "retailer": retailer_raw,
                    "email": email,
                    "date_sent": date.today().isoformat(),
                    "verified": "sent",
                    "notes": r.get("notes", ""),
                })
        else:
            failed += 1
            failures.append((email, info[:80]))
        if i < len(targets) and not dry:
            time.sleep(random.uniform(3.0, 8.0))
    log_f.close()
    print(
        f"sent={sent} failed={failed} skipped_dup={skipped_dup} "
        f"skipped_invalid={skipped_invalid} skipped_no_email={skipped_no_email} "
        f"log={log_path.relative_to(ROOT)}{dry_tag}"
    )
    for email, info in failures[:3]:
        print(f"  fail: {email} - {info}")


if __name__ == "__main__":
    main()
