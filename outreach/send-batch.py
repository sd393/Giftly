#!/usr/bin/env python3
"""Send Stanford Student Inquiry to a brand batch (non-fallback only).

Reads <batch>.csv, filters to rows with a real scraped email (email_source
starts with 'https://'), sends each via `gog gmail send`, and appends the
send to outreach-log.csv.

Stdout is summary-only. Per-row detail goes to logs/send-<batch-stem>.log.
"""
import csv
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

ACCOUNT = os.environ.get("GOG_ACCOUNT", "armaanp4423@gmail.com")
SUBJECT = "Stanford Student Inquiry"
BODY_TMPL = """Hi,

We're Stanford/Dartmouth students connecting DTC brands with vetted creators. We match you with creators who actually drive sales, and you only pay commission on results, no contracts.

Would you be interested in 2-3 creator profiles that'd be a great fit for {brand}?

Thanks,
Armaan
"""


def normalize_brand(raw: str) -> str:
    b = raw.strip()
    # "By Adina Eden" -> "Adina Eden"
    b = re.sub(r"^[Bb]y\s+", "", b)
    # All-caps tokens -> Title Case. Leave mixed-case brand styles alone.
    tokens = b.split()
    out = []
    for t in tokens:
        letters = [c for c in t if c.isalpha()]
        if letters and all(c.isupper() for c in letters) and len(letters) > 1:
            out.append(t.title())
        else:
            out.append(t)
    return " ".join(out)


def send_one(brand_raw: str, email: str, *, dry_run: bool) -> tuple[bool, str]:
    brand = normalize_brand(brand_raw)
    body = BODY_TMPL.format(brand=brand)
    cmd = [
        "gog", "--account", ACCOUNT, "gmail", "send",
        "--to", email,
        "--subject", SUBJECT,
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
            return True, (r.stdout.strip() or "ok")
        return False, (r.stderr.strip() or f"rc={r.returncode}")
    except Exception as e:
        return False, f"{type(e).__name__}: {e}"


def append_log(row: dict) -> None:
    fieldnames = ["name", "role", "brand", "domain", "email", "date_sent", "verified", "llm_evidence"]
    new_file = not LOG_CSV.exists()
    with LOG_CSV.open("a", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        if new_file:
            w.writeheader()
        w.writerow({k: row.get(k, "") for k in fieldnames})


def load_already_sent() -> set[str]:
    if not LOG_CSV.exists():
        return set()
    return {(r.get("brand") or "").strip().lower() for r in csv.DictReader(LOG_CSV.open()) if (r.get("brand") or "").strip()}


def main():
    dry = DRY_RUN
    with IN_CSV.open() as f:
        rows = list(csv.DictReader(f))
    already = load_already_sent()
    real = [r for r in rows if r.get("email_source", "").startswith("https://")]
    targets = [r for r in real if r["brand"].strip().lower() not in already]
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
        brand_raw = r["brand"]
        email = r["email"]
        ok, info = send_one(brand_raw, email, dry_run=dry)
        status = "OK " if ok else "FAIL"
        log(f"[{i:>2}/{len(targets)}] {status} {brand_raw:<32} {email:<40} {info}")
        if ok:
            sent += 1
            if not dry:
                append_log({
                    "brand": brand_raw,
                    "domain": r["domain"],
                    "email": email,
                    "date_sent": date.today().isoformat(),
                    "verified": "sent",
                    "llm_evidence": "throne-merchant",
                })
        else:
            failed += 1
            failures.append((brand_raw, info[:80]))
        if i < len(targets) and not dry:
            time.sleep(random.uniform(3.0, 8.0))
    log_f.close()
    print(f"sent={sent} failed={failed} skipped_dup={skipped_dup} log={log_path.relative_to(ROOT)}{dry_tag}")
    for brand, info in failures[:3]:
        print(f"  fail: {brand} — {info}")


if __name__ == "__main__":
    main()
