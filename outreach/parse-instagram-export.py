#!/usr/bin/env python3
"""Parse a Meta "Download Your Information" ZIP and extract outbound Giftly DMs.

Input: path to Meta-supplied ZIP (or already-extracted directory) that contains
`messages/inbox/<thread>/message_*.json` files.

Output: one CSV row per outbound DM the self-user sent in a thread that
mentions a Giftly-related keyword.

The CSV is a preview for manual review. Upload to the platform is deferred
until creator-upsert is wired up on the API side.

Usage:
    python3.12 parse-instagram-export.py <zip-or-dir> --self-name "Ethan Zhou" [--out instagram-dms.csv]

Notes on Meta's encoding quirk:
    Meta's JSON export double-encodes UTF-8 text as Latin-1 escape sequences.
    We decode it back to real UTF-8. This is well-documented behaviour.
"""
import argparse
import csv
import json
import re
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable


GIFTLY_KEYWORDS = [
    "giftly",
    "trygiftly",
    "creator partnership",
    "creator profile",
    "vetted creator",
    "commission only",
    "no contracts",
    "brand partnership",
    "brand collab",
    "brand collaboration",
]


def fix_meta_encoding(s: str) -> str:
    """Meta encodes UTF-8 bytes as Latin-1 escapes in their JSON export.
    Round-trip through latin-1 -> utf-8 to recover real characters."""
    try:
        return s.encode("latin-1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return s


def iter_message_files(root: Path) -> Iterable[Path]:
    """Yield every message_*.json file under messages/inbox/."""
    inbox = root / "your_instagram_activity" / "messages" / "inbox"
    if not inbox.exists():
        # Older/Facebook-style export path
        inbox = root / "messages" / "inbox"
    if not inbox.exists():
        return
    for thread_dir in sorted(inbox.iterdir()):
        if not thread_dir.is_dir():
            continue
        for p in sorted(thread_dir.glob("message_*.json")):
            yield p


def matches_giftly(text: str) -> bool:
    t = text.lower()
    return any(k in t for k in GIFTLY_KEYWORDS)


def extract_recipient_name(participants: list[dict], self_name: str) -> str:
    others = [p.get("name", "") for p in participants if p.get("name") != self_name]
    return ", ".join(fix_meta_encoding(n) for n in others) or "(unknown)"


def parse_thread(path: Path, self_name: str) -> list[dict]:
    try:
        data = json.loads(path.read_bytes().decode("utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as e:
        print(f"  skip {path}: {e}", file=sys.stderr)
        return []
    participants = data.get("participants") or []
    recipient = extract_recipient_name(participants, self_name)
    rows: list[dict] = []
    for m in data.get("messages") or []:
        sender = m.get("sender_name")
        if sender != self_name:
            continue
        mtype = m.get("type") or ""
        if mtype and mtype not in ("Generic", "Text"):
            # Skip reactions, shares, calls, system events.
            continue
        content = m.get("content")
        if not content:
            continue
        content = fix_meta_encoding(content)
        if not matches_giftly(content):
            continue
        ts_ms = m.get("timestamp_ms") or 0
        ts = datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc).isoformat() if ts_ms else ""
        rows.append({
            "sent_at": ts,
            "sender": self_name,
            "recipient": recipient,
            "thread_folder": path.parent.name,
            "body": content[:500],
            "ig_message_id": f"{path.parent.name}-{ts_ms}",
            "body_len": len(content),
        })
    return rows


def resolve_root(arg: str) -> Path:
    p = Path(arg).expanduser().resolve()
    if p.is_dir():
        return p
    if p.suffix.lower() == ".zip":
        out = p.with_suffix("")
        out.mkdir(exist_ok=True)
        with zipfile.ZipFile(p) as z:
            z.extractall(out)
        print(f"extracted {p} -> {out}")
        return out
    sys.exit(f"not a dir or zip: {p}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("input", help="Path to Meta export ZIP or extracted directory")
    ap.add_argument("--self-name", required=True,
                    help="Your display name as it appears in the export (e.g. 'Ethan Zhou')")
    ap.add_argument("--out", default="outreach/instagram-dms.csv",
                    help="Output CSV path (default: outreach/instagram-dms.csv)")
    ap.add_argument("--no-keyword-filter", action="store_true",
                    help="Skip Giftly-keyword filter; include all outbound DMs")
    args = ap.parse_args()

    global matches_giftly
    if args.no_keyword_filter:
        matches_giftly = lambda _t: True  # noqa: E731

    root = resolve_root(args.input)
    out_path = Path(args.out).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)

    all_rows: list[dict] = []
    thread_count = 0
    for mf in iter_message_files(root):
        thread_count += 1
        all_rows.extend(parse_thread(mf, args.self_name))

    all_rows.sort(key=lambda r: r["sent_at"])
    fieldnames = ["sent_at", "sender", "recipient", "thread_folder", "body", "ig_message_id", "body_len"]
    with out_path.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(all_rows)

    unique_recipients = len({r["recipient"] for r in all_rows})
    print(f"threads scanned: {thread_count}")
    print(f"outbound Giftly DMs found: {len(all_rows)}")
    print(f"unique recipients: {unique_recipients}")
    print(f"wrote: {out_path}")


if __name__ == "__main__":
    main()
