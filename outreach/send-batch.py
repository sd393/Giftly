#!/usr/bin/env python3
"""Send Berkeley Student Inquiry to a brand batch (non-fallback only).

Reads <batch>.csv, filters to rows with a real scraped email (email_source
starts with 'https://'), sends each via `gog gmail send`, and appends the
send to outreach-log.csv.

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
from datetime import date, datetime, timezone
from pathlib import Path

import giftly_api

ROOT = Path(__file__).parent
LOG_DIR = ROOT / "logs"
_args = [a for a in sys.argv[1:] if not a.startswith("--")]
IN_CSV = Path(_args[0]) if _args else (ROOT / "batch.csv")
LOG_CSV = ROOT / "outreach-log.csv"
VERBOSE = "--verbose" in sys.argv or "-v" in sys.argv
DRY_RUN = "--dry-run" in sys.argv
GMAIL_ID_RE = re.compile(r"\b([0-9a-f]{16,})\b")

ACCOUNT = os.environ.get("GOG_ACCOUNT", "ethanpzhou@berkeley.edu")

# Per-account subject + body. Both strings accept `{brand}` via str.format.
TEMPLATES: dict[str, dict[str, str]] = {
    "ethan@trygiftly.com": {
        "subject": "Creator partnership for {brand}?",
        "body": """Hi,

I run Giftly. We connect DTC brands with vetted creators who actually drive sales, and you only pay commission on results, no contracts.

Would you be interested in 2-3 creator profiles that'd be a great fit for {brand}?

Thanks,
Ethan
""",
    },
}

DEFAULT_TEMPLATE = {
    "subject": "Berkeley Student Inquiry",
    "body": """Hi,

We're Berkeley students connecting DTC brands with vetted creators. We match you with creators who actually drive sales, and you only pay commission on results, no contracts.

Would you be interested in 2-3 creator profiles that'd be a great fit for {brand}?

Thanks,
Ethan
""",
}

_tmpl = TEMPLATES.get(ACCOUNT, DEFAULT_TEMPLATE)
SUBJECT_TMPL = _tmpl["subject"]
BODY_TMPL = _tmpl["body"]


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


def send_one(brand_raw: str, email: str, *, dry_run: bool) -> tuple[bool, str, str, str | None]:
    """Send one email via gog. Returns (ok, info, body, external_id)."""
    brand = normalize_brand(brand_raw)
    subject = SUBJECT_TMPL.format(brand=brand)
    body = BODY_TMPL.format(brand=brand)
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
    """Pull a Gmail message id out of whatever `gog gmail send` printed.

    Tries JSON first (gog may emit `{"id": "..."}` or `{"message": {"id": ...}}`),
    then falls back to the first 16+ char hex token in the output.
    """
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
    fieldnames = ["name", "role", "brand", "domain", "email", "date_sent", "verified", "llm_evidence"]
    new_file = not LOG_CSV.exists()
    with LOG_CSV.open("a", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        if new_file:
            w.writeheader()
        w.writerow({k: row.get(k, "") for k in fieldnames})


def _dedup_key(raw: str) -> str:
    return normalize_brand(raw).strip().lower()


def load_already_sent() -> set[str]:
    if not LOG_CSV.exists():
        return set()
    return {_dedup_key(r.get("brand") or "") for r in csv.DictReader(LOG_CSV.open()) if (r.get("brand") or "").strip()}


def main():
    dry = DRY_RUN
    with IN_CSV.open() as f:
        rows = list(csv.DictReader(f))
    already = load_already_sent()
    real = [r for r in rows if r.get("email_source", "").startswith("https://")]
    targets = [r for r in real if _dedup_key(r["brand"]) not in already]
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
    api_ready = giftly_api.is_configured()
    if not api_ready:
        log("WARN: GIFTLY_API_URL/GIFTLY_API_TOKEN unset — skipping platform mirroring")
    log(f"account={ACCOUNT} targets={len(targets)} skipped_dup={skipped_dup} api={'on' if api_ready else 'off'}{dry_tag}")
    sent = failed = mirrored = mirror_failed = 0
    failures: list[tuple[str, str]] = []
    for i, r in enumerate(targets, 1):
        brand_raw = r["brand"]
        email = r["email"]
        ok, info, body, external_id = send_one(brand_raw, email, dry_run=dry)
        status = "OK " if ok else "FAIL"
        id_tag = f" id={external_id}" if external_id else ""
        log(f"[{i:>2}/{len(targets)}] {status} {brand_raw:<32} {email:<40} {info}{id_tag}")
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
                if api_ready:
                    mirror_ok, mirror_info = _mirror_to_api(
                        brand_raw=brand_raw,
                        domain=r.get("domain", ""),
                        email=email,
                        body=body,
                        external_id=external_id,
                    )
                    if mirror_ok:
                        mirrored += 1
                    else:
                        mirror_failed += 1
                        log(f"         api: {mirror_info}")
        else:
            failed += 1
            failures.append((brand_raw, info[:80]))
        if i < len(targets) and not dry:
            time.sleep(random.uniform(3.0, 8.0))
    log_f.close()
    api_tag = f" mirrored={mirrored}" if api_ready else ""
    api_fail_tag = f" mirror_failed={mirror_failed}" if mirror_failed else ""
    print(
        f"sent={sent} failed={failed} skipped_dup={skipped_dup}{api_tag}{api_fail_tag} "
        f"log={log_path.relative_to(ROOT)}{dry_tag}"
    )
    for brand, info in failures[:3]:
        print(f"  fail: {brand} — {info}")


def _mirror_to_api(
    *, brand_raw: str, domain: str, email: str, body: str, external_id: str | None
) -> tuple[bool, str]:
    brand_norm = normalize_brand(brand_raw)
    try:
        brand_id = giftly_api.upsert_brand(
            brand_name=brand_norm,
            website=domain or email.split("@", 1)[-1],
        )
    except giftly_api.ApiError as e:
        return False, f"upsert_brand failed: {e}"

    # Stash the scraped contact email on the message so process-bounces can
    # map a DSN back to this row even if there's no gmail id.
    metadata = {"contact_email": email.lower()}
    try:
        giftly_api.log_outbound_message(
            entity_type="brand",
            entity_id=brand_id,
            channel="email",
            subject=SUBJECT_TMPL.format(brand=brand_norm),
            body=body,
            sender_account=ACCOUNT,
            status="sent",
            external_id=external_id,
            sent_at=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            metadata=metadata,
        )
    except giftly_api.ApiError as e:
        return False, f"log_outbound_message failed: {e}"

    return True, "ok"


if __name__ == "__main__":
    main()
