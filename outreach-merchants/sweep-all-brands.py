#!/usr/bin/env python3
"""Orchestrate the full 474-brand discover + verify sweep in 6 batches.

For each batch:
  1. Write sweep-state/batch-N-trimmed.csv (~79 brands)
  2. Copy → trimmed.csv, run discover-staff-linkedin.py
  3. Save → sweep-state/batch-N-contacts.csv
  4. Copy → contacts.csv, run verify-staff.py
  5. Save → sweep-state/batch-N-verified.csv
  6. Append per-batch verified to sweep-state/verified-all.csv
  7. Update sweep-state/per-brand-findings.csv (one row per brand with summary)
  8. Sleep 30 min before next batch (LinkedIn + MX IP cooldown)

Failure handling:
  - If discover-staff times out (> 90 min) → save partial, continue to verify
  - If verify-staff times out (> 60 min) → save partial, continue to next batch
  - Per-batch logs in sweep-state/batch-N.log

Resume: --start-batch N skips earlier batches. Useful if the script crashes
or LinkedIn rate-limits us mid-run.
"""
import argparse
import csv
import os
import shutil
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).parent
STATE = ROOT / "sweep-state"
STATE.mkdir(exist_ok=True)
MASTER_CSV = STATE / "verified-all.csv"
FINDINGS_CSV = STATE / "per-brand-findings.csv"
SWEEP_LOG = STATE / "sweep.log"

CLEAN_CSV = ROOT / "midsize-500-clean.csv"
ALREADY_DONE_CSV = ROOT / "trimmed.csv"  # the 25 already in the original run
TRIMMED_CSV = ROOT / "trimmed.csv"  # gets overwritten per batch
CONTACTS_CSV = ROOT / "contacts.csv"  # gets overwritten per batch
VERIFIED_CSV = ROOT / "verified.csv"  # gets overwritten per batch

DISCOVER_TIMEOUT = 90 * 60  # 90 min per batch
VERIFY_TIMEOUT = 60 * 60    # 60 min per batch
BATCH_COOLDOWN = 30 * 60    # 30 min between batches


def log(msg: str) -> None:
    ts = datetime.now().isoformat(timespec="seconds")
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    with SWEEP_LOG.open("a") as f:
        f.write(line + "\n")


def assert_headed_browser() -> None:
    """Bail if the browse daemon isn't in headed mode. Headless mode means
    we lost the operator's logged-in Chrome session — discover-staff-linkedin
    will silently fail every Google + LinkedIn lookup (the burning-batches
    failure mode hit on 2026-05-23/24)."""
    B = os.environ.get("BROWSE_BIN", str(Path.home() / ".claude/skills/gstack/browse/dist/browse"))
    r = subprocess.run([B, "status"], capture_output=True, text=True, timeout=10)
    if "Mode: headed" not in r.stdout:
        msg = (
            f"BROWSER NOT HEADED — daemon in '{r.stdout.strip()}'. "
            f"Re-run /connect-chrome and re-login to LinkedIn before resuming. "
            f"Then: python3 sweep-all-brands.py --start-batch <N>"
        )
        log(msg)
        sys.exit(2)


def load_already_done() -> set[str]:
    """Domains in the original 25-brand trimmed.csv to exclude from the sweep."""
    done = set()
    if ALREADY_DONE_CSV.exists():
        for r in csv.DictReader(open(ALREADY_DONE_CSV)):
            done.add(r["domain"].strip().lower())
    return done


def split_into_batches(remaining: list[dict], n_batches: int) -> list[list[dict]]:
    """Split remaining brands into roughly-equal batches."""
    per = (len(remaining) + n_batches - 1) // n_batches
    return [remaining[i:i+per] for i in range(0, len(remaining), per)]


def write_csv(path: Path, rows: list[dict], fieldnames: list[str]) -> None:
    with path.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)


def append_csv(path: Path, rows: list[dict], fieldnames: list[str]) -> None:
    new_file = not path.exists()
    with path.open("a", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        if new_file:
            w.writeheader()
        w.writerows(rows)


def run_subprocess(cmd: list[str], timeout: int, batch_log: Path, env: dict | None = None) -> int:
    """Run a subprocess, append stdout+stderr to batch log, return exit code."""
    log(f"  exec: {' '.join(cmd)}")
    with batch_log.open("a") as f:
        f.write(f"\n=== {' '.join(cmd)} ===\n")
        try:
            r = subprocess.run(cmd, stdout=f, stderr=subprocess.STDOUT,
                               timeout=timeout, env=env)
            return r.returncode
        except subprocess.TimeoutExpired:
            f.write(f"\n!!! TIMEOUT after {timeout}s\n")
            log(f"  TIMEOUT after {timeout}s")
            return -1


def summarize_batch(batch_n: int, contacts_path: Path, verified_path: Path) -> dict:
    """Return per-batch summary stats."""
    n_contacts = sum(1 for _ in csv.DictReader(open(contacts_path))) if contacts_path.exists() else 0
    verified_rows = list(csv.DictReader(open(verified_path))) if verified_path.exists() else []
    brands_covered = {r["brand"] for r in verified_rows}
    return {
        "batch": batch_n,
        "contacts": n_contacts,
        "verified": len(verified_rows),
        "brands_with_verified": len(brands_covered),
    }


def per_brand_findings(batch_n: int, batch_brands: list[dict],
                       contacts_path: Path, verified_path: Path) -> list[dict]:
    """One row per brand summarizing what we got."""
    contacts_by_brand: dict[str, int] = {}
    if contacts_path.exists():
        for r in csv.DictReader(open(contacts_path)):
            contacts_by_brand[r["brand"]] = contacts_by_brand.get(r["brand"], 0) + 1
    verified_by_brand: dict[str, int] = {}
    if verified_path.exists():
        for r in csv.DictReader(open(verified_path)):
            verified_by_brand[r["brand"]] = verified_by_brand.get(r["brand"], 0) + 1
    rows = []
    for b in batch_brands:
        brand = b["brand"]
        n_contacts = contacts_by_brand.get(brand, 0)
        n_verified = verified_by_brand.get(brand, 0)
        if n_verified > 0:
            status = "ok"
        elif n_contacts > 0:
            status = "no_pattern_or_ip_blocked"
        else:
            status = "linkedin_lookup_failed"
        rows.append({
            "batch": batch_n,
            "brand": brand,
            "domain": b["domain"],
            "contacts_found": n_contacts,
            "verified_count": n_verified,
            "status": status,
        })
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n-batches", type=int, default=6)
    ap.add_argument("--start-batch", type=int, default=1,
                    help="Skip earlier batches (1-indexed). Useful for resume.")
    ap.add_argument("--cooldown", type=int, default=BATCH_COOLDOWN,
                    help="Seconds between batches (default 1800).")
    ap.add_argument("--keyring-password", default=os.environ.get("GOG_KEYRING_PASSWORD"),
                    help="Required for verify-staff (gmail sibling-dedup). Falls back to env.")
    args = ap.parse_args()

    if not args.keyring_password:
        print("ERROR: GOG_KEYRING_PASSWORD env required for verify-staff", file=sys.stderr)
        sys.exit(1)

    if not CLEAN_CSV.exists():
        print(f"ERROR: {CLEAN_CSV} not found", file=sys.stderr)
        sys.exit(1)

    # Snapshot the "already done" set BEFORE we start (otherwise we'd erase it
    # the moment we write the first batch's trimmed.csv).
    already_done = load_already_done()
    log(f"already-done set: {len(already_done)} brands")

    all_brands = [r for r in csv.DictReader(open(CLEAN_CSV))]
    remaining = [r for r in all_brands if r["domain"].strip().lower() not in already_done]
    log(f"total clean: {len(all_brands)}, already done: {len(already_done)}, remaining: {len(remaining)}")

    batches = split_into_batches(remaining, args.n_batches)
    log(f"split into {len(batches)} batches: {[len(b) for b in batches]}")

    env = os.environ.copy()
    env["GOG_KEYRING_PASSWORD"] = args.keyring_password

    summaries = []
    for i, batch in enumerate(batches, 1):
        if i < args.start_batch:
            log(f"--- batch {i}: SKIPPED per --start-batch ---")
            continue
        log(f"=== batch {i}/{len(batches)} START — {len(batch)} brands ===")
        assert_headed_browser()  # bail fast if browser session died
        batch_dir = STATE / f"batch-{i:02d}"
        batch_dir.mkdir(exist_ok=True)
        batch_log = batch_dir / "batch.log"
        per_batch_trimmed = batch_dir / "trimmed.csv"
        per_batch_contacts = batch_dir / "contacts.csv"
        per_batch_verified = batch_dir / "verified.csv"

        # 1. Write batch trimmed.csv + copy → ROOT/trimmed.csv
        write_csv(per_batch_trimmed, batch, ["domain", "brand"])
        shutil.copy(per_batch_trimmed, TRIMMED_CSV)
        log(f"  wrote batch {i} trimmed: {len(batch)} brands")

        # 2. Discover
        log(f"  --- discover-staff-linkedin.py ---")
        rc = run_subprocess(
            ["python3", str(ROOT / "discover-staff-linkedin.py")],
            timeout=DISCOVER_TIMEOUT, batch_log=batch_log, env=env,
        )
        log(f"  discover rc={rc}")
        if CONTACTS_CSV.exists():
            shutil.copy(CONTACTS_CSV, per_batch_contacts)

        # 3. Verify
        log(f"  --- verify-staff.py ---")
        rc = run_subprocess(
            ["python3", str(ROOT / "verify-staff.py")],
            timeout=VERIFY_TIMEOUT, batch_log=batch_log, env=env,
        )
        log(f"  verify rc={rc}")
        if VERIFIED_CSV.exists():
            shutil.copy(VERIFIED_CSV, per_batch_verified)

        # 4. Append to master
        if per_batch_verified.exists():
            rows = list(csv.DictReader(open(per_batch_verified)))
            if rows:
                append_csv(MASTER_CSV, rows, list(rows[0].keys()))
                log(f"  appended {len(rows)} verified rows to {MASTER_CSV.relative_to(ROOT)}")

        # 5. Per-brand findings
        findings = per_brand_findings(i, batch, per_batch_contacts, per_batch_verified)
        append_csv(FINDINGS_CSV, findings,
                   ["batch", "brand", "domain", "contacts_found", "verified_count", "status"])
        ok = sum(1 for f in findings if f["status"] == "ok")
        log(f"  per-brand: {ok}/{len(findings)} brands with verified contacts")

        # 6. Batch summary
        summary = summarize_batch(i, per_batch_contacts, per_batch_verified)
        summaries.append(summary)
        log(f"  === batch {i} DONE: {summary['verified']} verified across "
            f"{summary['brands_with_verified']} brands (of {len(batch)} input) ===")

        # 7. Cooldown (skip after last batch)
        if i < len(batches):
            log(f"  cooldown {args.cooldown}s before batch {i+1}...")
            time.sleep(args.cooldown)

    log("=== SWEEP COMPLETE ===")
    total_verified = 0
    for s in summaries:
        total_verified += s["verified"]
        log(f"  batch {s['batch']}: {s['verified']} verified | {s['brands_with_verified']} brands")
    log(f"TOTAL: {total_verified} verified emails")
    log(f"Master: {MASTER_CSV}")
    log(f"Findings: {FINDINGS_CSV}")


if __name__ == "__main__":
    main()
