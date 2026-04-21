#!/usr/bin/env python3
"""Upload parsed Instagram DM CSVs to the Giftly platform.

For each row in the CSV:
  1. Upsert the recipient as a creator (synthetic email from thread_folder)
  2. Log the DM as an outbound_messages row (channel=instagram)

Idempotent on the creator side via external_ref. Messages include
external_id so partner's de-dup logic on outbound_messages.external_id
should prevent most double-logging, but re-running still costs API calls —
run once per CSV.
"""
import csv
import sys
import urllib.parse
import urllib.request
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import giftly_api  # noqa: E402

ROOT = Path(__file__).parent


def load_existing_external_ids() -> set[str]:
    """Fetch every outbound_message whose channel=instagram already in the
    platform and return the set of external_ids. Used to skip DMs that were
    logged by a previous import — Meta exports are snapshots, every new one
    contains the full history."""
    ids: set[str] = set()
    # API caps limit at 500. Paginate until we see a short page.
    offset = 0
    page = 500
    while True:
        qs = urllib.parse.urlencode({"channel": "instagram", "limit": page, "offset": offset})
        url = f"{giftly_api.API_URL}/api/outbound/messages?{qs}"
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {giftly_api.API_TOKEN}"})
        with urllib.request.urlopen(req, timeout=20) as r:
            d = json.loads(r.read())
        rows = d.get("data", [])
        for row in rows:
            ext = row.get("external_id")
            if ext:
                ids.add(ext)
        if len(rows) < page:
            break
        offset += page
    return ids


def normalize_ts(s: str) -> str:
    """Convert `2026-04-21T07:12:18.307000+00:00` -> `2026-04-21T07:12:18Z`.
    Zod's .datetime() rejects numeric offsets and fractional microseconds."""
    if not s:
        return s
    # Strip trailing microseconds block if present: .307000+00:00 -> +00:00
    if "." in s:
        dot = s.index(".")
        # Keep up to 3 ms digits (common ISO), then the offset part
        tail = s[dot:]
        offset_start = tail.find("+")
        if offset_start == -1:
            offset_start = tail.find("-", 1)
        if offset_start != -1:
            s = s[:dot] + tail[offset_start:]
        else:
            s = s[:dot]
    # Convert +00:00 -> Z
    if s.endswith("+00:00"):
        s = s[:-6] + "Z"
    return s


def upload_csv(csv_path: Path, sender_account: str, source_tag: str,
               existing_ext_ids: set[str]) -> tuple[int, int, int]:
    ok = fail = skipped = 0
    with csv_path.open() as f:
        rows = list(csv.DictReader(f))
    for i, r in enumerate(rows, 1):
        recipient = (r.get("recipient") or "").strip() or "(unknown)"
        thread_folder = (r.get("thread_folder") or "").strip()
        body = r.get("body") or ""
        sent_at = normalize_ts(r.get("sent_at") or "")
        external_id = r.get("ig_message_id") or None
        if not body or not thread_folder:
            fail += 1
            print(f"  [{i}/{len(rows)}] SKIP {recipient}: missing body or thread_folder")
            continue
        if external_id and external_id in existing_ext_ids:
            skipped += 1
            continue
        try:
            cid = giftly_api.upsert_creator(
                recipient,
                external_ref=thread_folder,
                platform="Instagram",
                social_handles=f"IG thread: {thread_folder}",
                notes="Imported from Instagram DM export",
            )
            giftly_api.log_outbound_message(
                entity_type="creator",
                entity_id=cid,
                channel="instagram",
                body=body,
                sender_account=sender_account,
                status="sent",
                external_id=external_id,
                sent_at=sent_at or None,
                metadata={
                    "source": "instagram_dm_export",
                    "account": source_tag,
                    "thread_folder": thread_folder,
                },
            )
            ok += 1
        except giftly_api.ApiError as e:
            fail += 1
            print(f"  [{i}/{len(rows)}] FAIL {recipient}: {e.status} {e.code} {e.message}")
        except Exception as e:
            fail += 1
            print(f"  [{i}/{len(rows)}] FAIL {recipient}: {type(e).__name__}: {e}")
    return ok, fail, skipped


def main() -> None:
    if not giftly_api.is_configured():
        print("ERROR: GIFTLY_API_URL / GIFTLY_API_TOKEN not set", file=sys.stderr)
        sys.exit(1)

    jobs = [
        (ROOT / "instagram-dms-giftly.csv", "@trygiftly", "giftly"),
        (ROOT / "instagram-dms-ethan.csv", "@ethanzhou5", "ethanzhou5"),
    ]
    print("fetching existing instagram external_ids…")
    existing = load_existing_external_ids()
    print(f"  {len(existing)} already in platform, will skip those")
    total_ok = total_fail = total_skipped = 0
    for path, sender, tag in jobs:
        if not path.exists():
            print(f"SKIP (no file): {path}")
            continue
        print(f"\n=== {path.name} (sender={sender}) ===")
        ok, fail, skipped = upload_csv(path, sender, tag, existing)
        print(f"  ok={ok} skipped_dup={skipped} fail={fail}")
        total_ok += ok
        total_fail += fail
        total_skipped += skipped
    print(f"\nTotal ok={total_ok} skipped_dup={total_skipped} fail={total_fail}")


if __name__ == "__main__":
    main()
