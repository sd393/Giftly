#!/usr/bin/env python3
"""Autonomous chunked sender with account fallback + PROGRESS.md updates.

Wraps send-batch.py for the throne-batch-23 campaign. Splits the verified rows
of <batch>.csv into CHUNK_SIZE-row pieces, runs send-batch.py per chunk, and
swaps to the secondary account when the primary appears rate-limited. Writes
a one-line summary per chunk to PROGRESS-throne-23.md and to logs/.

Stops when:
- both accounts have hit rate limits in the same chunk
- all chunks are sent
- KeyboardInterrupt

Usage:
    GOG_KEYRING_PASSWORD=... python3 send-autonomous.py <batch.csv> \\
        --primary armaan.priyadarshan.29@dartmouth.edu \\
        --secondary armaanp4423@gmail.com

Detection heuristic: a chunk is "rate-limited" if failed/attempted >= 0.3
or stderr from any gog call contains a known rate-limit phrase. The wrapper
inspects logs/send-<chunk>.log for each chunk's outcome.
"""
import argparse
import csv
import os
import re
import shutil
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).parent
LOG_DIR = ROOT / "logs"
PROGRESS = ROOT / "PROGRESS-throne-23.md"
DEFAULT_CHUNK = 60

RATE_LIMIT_RE = re.compile(
    r"(rate.limit|quota.exceed|too many|429|user.sending.limit|temporarily.unavailable)",
    re.IGNORECASE,
)


def now_iso() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M")


def append_progress(line: str) -> None:
    PROGRESS.parent.mkdir(exist_ok=True)
    PROGRESS.open("a").write(line.rstrip() + "\n")


def init_progress(batch: Path, total: int, primary: str, secondary: str, chunk: int) -> None:
    if not PROGRESS.exists():
        PROGRESS.write_text(
            f"# Throne batch 23 — autonomous send progress\n\n"
            f"Started {now_iso()}.  batch={batch.name}  total_verified={total}  "
            f"chunk_size={chunk}\nPrimary: {primary}\nSecondary: {secondary}\n\n"
            f"## Chunk timeline\n\n"
        )


def chunk_log_path(stem: str) -> Path:
    return LOG_DIR / f"send-{stem}.log"


def load_already_sent_keys() -> set[str]:
    """Mirror send-batch's dedup so we know how many real targets each chunk has
    *after* dedup before invoking the script."""
    log = ROOT / "outreach-log.csv"
    if not log.exists():
        return set()
    keys = set()
    for r in csv.DictReader(log.open()):
        b = (r.get("brand") or "").strip()
        if b:
            keys.add(_normalize_key(b))
    return keys


def _normalize_key(raw: str) -> str:
    b = raw.strip()
    b = re.sub(r"^[Bb]y\s+", "", b)
    out = []
    for t in b.split():
        letters = [c for c in t if c.isalpha()]
        if letters and all(c.isupper() for c in letters) and len(letters) > 1:
            out.append(t.title())
        else:
            out.append(t)
    return " ".join(out).strip().lower()


def chunk_rows(rows: list[dict], size: int) -> list[list[dict]]:
    return [rows[i : i + size] for i in range(0, len(rows), size)]


def write_chunk_csv(rows: list[dict], path: Path, fieldnames: list[str]) -> None:
    with path.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in fieldnames})


def run_send(chunk_csv: Path, account: str, include_fallback: bool = False) -> tuple[int, int, int, str]:
    """Returns (sent, failed, skipped_dup, log_text)."""
    env = os.environ.copy()
    env["GOG_ACCOUNT"] = account
    cmd = ["python3", str(ROOT / "send-batch.py"), str(chunk_csv)]
    if include_fallback:
        cmd.append("--include-fallback")
    r = subprocess.run(cmd, env=env, capture_output=True, text=True)
    out = r.stdout.strip()
    err = r.stderr.strip()
    sent = failed = skipped = 0
    m = re.search(r"sent=(\d+)\s+failed=(\d+)\s+skipped_dup=(\d+)", out)
    if m:
        sent, failed, skipped = int(m.group(1)), int(m.group(2)), int(m.group(3))
    log_path = chunk_log_path(chunk_csv.stem)
    log_text = log_path.read_text() if log_path.exists() else ""
    if err and r.returncode != 0:
        log_text += f"\n[stderr] {err}\n"
    return sent, failed, skipped, log_text


def looks_rate_limited(failed: int, attempted: int, log_text: str, threshold: int = 3) -> bool:
    """Two ways a chunk is rate-limited:
    1. Failure ratio >= 0.3 with >= 3 failures (consistent failure pattern).
    2. There's at least one failure AND a rate-limit phrase in the log
       (not just the regex match — round-1 chunk 4 false-positive was caused
       by a brand description containing a regex-matching word with 0
       actual failures).
    """
    if attempted == 0:
        return False
    if failed >= threshold and failed / max(attempted, 1) >= 0.3:
        return True
    if failed >= 1 and RATE_LIMIT_RE.search(log_text):
        return True
    return False


def run_bounces(account: str) -> None:
    cmd = [
        "python3", str(ROOT / "process-bounces.py"),
        "--account", account, "--since", "30m",
    ]
    subprocess.run(cmd, capture_output=True, text=True)


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("batch")
    p.add_argument("--primary", required=True)
    p.add_argument("--secondary", required=True)
    p.add_argument("--chunk", type=int, default=DEFAULT_CHUNK)
    p.add_argument("--sleep-between", type=int, default=120, help="seconds")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--include-fallback", action="store_true",
                   help="Allow fallback-source rows (hello@domain). Overrides "
                        "OUTREACH.md hard rule — only with explicit auth.")
    p.add_argument("--rl-fail-threshold", type=int, default=3,
                   help="Number of failures in a chunk that triggers swap.")
    args = p.parse_args()

    if "GOG_KEYRING_PASSWORD" not in os.environ:
        print("ERROR: GOG_KEYRING_PASSWORD not set", file=sys.stderr)
        return 1

    batch = Path(args.batch)
    with batch.open() as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fieldnames = list(reader.fieldnames or [])

    if args.include_fallback:
        verified = [r for r in rows if r.get("email", "").strip()]
    else:
        verified = [r for r in rows if r.get("email_source", "").startswith("https://")]
    already = load_already_sent_keys()
    targets = [r for r in verified if _normalize_key(r.get("brand", "")) not in already]
    skipped_pre = len(verified) - len(targets)

    chunks = chunk_rows(targets, args.chunk)
    init_progress(batch, len(targets), args.primary, args.secondary, args.chunk)
    append_progress(
        f"- {now_iso()}  plan: verified={len(verified)} pre_dedup_skip={skipped_pre} "
        f"to_send={len(targets)} chunks={len(chunks)} chunk_size={args.chunk}"
    )

    chunk_dir = ROOT / "chunks-throne-23"
    if chunk_dir.exists():
        shutil.rmtree(chunk_dir)
    chunk_dir.mkdir()

    account = args.primary
    other = args.secondary
    primary_failed = False
    secondary_failed = False
    total_sent = total_failed = 0

    for i, c in enumerate(chunks, 1):
        chunk_csv = chunk_dir / f"chunk-{i:03d}.csv"
        write_chunk_csv(c, chunk_csv, fieldnames)
        attempt_acct = account
        if args.dry_run:
            append_progress(
                f"- {now_iso()}  chunk {i}/{len(chunks)}  DRY-RUN  size={len(c)} acct={attempt_acct}"
            )
            continue
        sent, failed, skipped, log_text = run_send(chunk_csv, attempt_acct, args.include_fallback)
        total_sent += sent
        total_failed += failed
        rl = looks_rate_limited(failed, sent + failed, log_text, args.rl_fail_threshold)
        append_progress(
            f"- {now_iso()}  chunk {i:03d}/{len(chunks)}  "
            f"sent={sent} failed={failed} skipped={skipped} "
            f"acct={attempt_acct.split('@')[0]}{'  RATE-LIMIT?' if rl else ''}"
        )
        if rl:
            if attempt_acct == args.primary:
                primary_failed = True
                append_progress(f"- {now_iso()}  swapping to secondary {other}")
                account, other = other, account
                # Retry this chunk with the other account.
                sent2, failed2, skipped2, log_text2 = run_send(chunk_csv, account)
                total_sent += sent2
                total_failed += failed2
                rl2 = looks_rate_limited(failed2, sent2 + failed2, log_text2, args.rl_fail_threshold)
                append_progress(
                    f"- {now_iso()}  chunk {i:03d}/{len(chunks)} retry  "
                    f"sent={sent2} failed={failed2} skipped={skipped2} "
                    f"acct={account.split('@')[0]}{'  RATE-LIMIT?' if rl2 else ''}"
                )
                if rl2:
                    secondary_failed = True
                    append_progress(
                        f"- {now_iso()}  STOP: both accounts rate-limited"
                    )
                    break
            else:
                secondary_failed = True
                append_progress(f"- {now_iso()}  STOP: secondary also rate-limited")
                break
        # Sweep bounces for the account that just sent.
        run_bounces(account)
        if i < len(chunks):
            time.sleep(args.sleep_between)

    append_progress(
        f"- {now_iso()}  done. total_sent={total_sent} total_failed={total_failed} "
        f"primary_rate_limited={primary_failed} secondary_rate_limited={secondary_failed}"
    )
    print(
        f"total_sent={total_sent} total_failed={total_failed} "
        f"primary_rl={primary_failed} secondary_rl={secondary_failed}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
