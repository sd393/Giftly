#!/usr/bin/env python3
"""Harvest Stanford Student Inquiry inbox threads from a gog-authed account
and cache them as JSON under outreach/.gmail-cache/. The import script picks
up every JSON file in that directory.

Usage:
  GOG_KEYRING_PASSWORD=... scripts/collect-gmail-replies.py \\
      armaan.priyadarshan.29@dartmouth.edu

A second call with a different account writes a second cache file; the
importer merges both.
"""
import base64
import json
import os
import re
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = REPO_ROOT / "outreach" / ".gmail-cache"

AUTO_SUBJECT_RE = re.compile(
    r"(automatic reply|out of office|case #|request received|ticket"
    r"|\[[\w\s-]+\] re:|^\d+ - )",
    re.I,
)
AUTO_BODY_RE = re.compile(
    r"(thank you for (contacting|reaching out|getting in touch)"
    r"|thanks for (contacting|reaching out|getting in touch|hitting us|your message)"
    r"|thanks so much for reaching out"
    r"|we(?:['’]|)ve received your"
    r"|received your (request|message|email|query|inquiry)"
    r"|your (request|ticket|case|message) (has been received|\(\d+\) has been)"
    r"|out of (the )?office"
    r"|automated (message|reply|response)"
    r"|will (get back to|respond to) you"
    r"|we will respond"
    r"|we(?:['’]|)ll (get back|respond)"
    r"|response time is"
    r"|currently closed|our office is closed"
    r"|outside of business hours|office hours are|email hours are"
    r"|don(?:['’]|)t respond to this email"
    r"|please (forward|send|use|email) [^.]{0,80} (partnerships|press|pr|influencer|collab)"
    r"|your feedback is important"
    r"|please take a moment to (let us know how|rate)"
    r"|how (do you feel about|would you rate)"
    r"|new reply to your ticket|we(?:['’]|)ve opened a ticket"
    r"|our team reviews every survey"
    r"|we are happy to forward your request"
    r"|we have received your message"
    r"|ticket-tidio|gorgias\.com|ada\.support|zendesk\.com|reamaze\.com"
    r"|we(?:['’]|)re truly grateful for your patience)",
    re.I,
)
BOUNCE_RE = re.compile(
    r"(undeliverable|mail delivery failed|delivery status notification"
    r"|could(?:n(?:['’]|)|\s+no)t be delivered"
    r"|address not found|recipient unknown|user unknown"
    r"|mail delivery subsystem|mailer-daemon"
    r"|your message could not be delivered|your email couldn(?:['’]|)t be)",
    re.I,
)


def run_gog(account: str, *args: str) -> dict:
    result = subprocess.run(
        ["gog", "--account", account, *args, "--json"],
        capture_output=True,
        text=True,
        env=os.environ.copy(),
        timeout=30,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"gog {' '.join(args)} failed rc={result.returncode}: {result.stderr[:400]}"
        )
    return json.loads(result.stdout)


def header(msg, name: str) -> str:
    for h in (msg.get("payload") or {}).get("headers") or []:
        if h.get("name", "").lower() == name.lower():
            return h.get("value", "")
    return ""


def body_text(msg) -> str:
    payload = msg.get("payload") or {}
    collected: list[str] = []

    def walk(part):
        b = part.get("body") or {}
        mime = part.get("mimeType") or ""
        data = b.get("data")
        if data and mime.startswith("text/"):
            try:
                decoded = base64.urlsafe_b64decode(data + "==").decode(
                    "utf-8", errors="ignore"
                )
                collected.append(decoded)
            except Exception:
                pass
        for sub in part.get("parts") or []:
            walk(sub)

    walk(payload)
    return "\n".join(collected)[:4000]


EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")


def extract_email(s: str) -> str:
    m = EMAIL_RE.search(s or "")
    return m.group(0).strip().lower() if m else ""


def classify(msg, self_email: str) -> str:
    subject = header(msg, "Subject")
    from_val = header(msg, "From")
    body = body_text(msg)
    blob = re.sub(r"[\s\xa0]+", " ", " ".join([subject, body, from_val]))

    if self_email.lower() in from_val.lower():
        return "self"
    if (
        "mailer-daemon" in from_val.lower()
        or "postmaster@" in from_val.lower()
        or BOUNCE_RE.search(blob)
    ):
        return "bounced"
    if AUTO_SUBJECT_RE.search(subject) or AUTO_BODY_RE.search(blob):
        return "auto"
    return "real"


def main():
    if len(sys.argv) < 2:
        print(f"usage: {sys.argv[0]} <account>", file=sys.stderr)
        sys.exit(2)
    account = sys.argv[1]

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    list_file = CACHE_DIR / f"{account}-inbox.json"
    out_file = CACHE_DIR / f"{account.split('@')[0]}-threads.json"

    # Step 1: list inbox messages matching the subject.
    list_result = run_gog(
        account,
        "gmail",
        "messages",
        "search",
        'subject:"Stanford Student Inquiry" in:inbox',
        "--all",
        "--max",
        "500",
    )
    list_file.write_text(json.dumps(list_result, indent=2))
    msgs = list_result.get("messages") or []
    thread_ids = sorted({m["threadId"] for m in msgs})
    print(f"{account}: {len(msgs)} msgs across {len(thread_ids)} threads",
          file=sys.stderr)

    # Step 2: fetch each thread and collect inbound messages.
    results: list[dict] = []
    for i, tid in enumerate(thread_ids, 1):
        print(f"  [{i:>3}/{len(thread_ids)}] {tid}", file=sys.stderr)
        try:
            payload = run_gog(account, "gmail", "thread", "get", tid)
        except Exception as e:
            print(f"    failed: {e}", file=sys.stderr)
            continue
        thread_msgs = (payload.get("thread") or {}).get("messages") or []
        if not thread_msgs:
            continue

        first_outbound = next(
            (m for m in thread_msgs if "SENT" in (m.get("labelIds") or [])),
            None,
        )
        if first_outbound is not None:
            recipient = extract_email(header(first_outbound, "To"))
        else:
            # No SENT message in the thread (happens when the brand's reply
            # arrives in a separate thread from our send). Fall back to the
            # inbound sender's address — that's who we cold-emailed.
            inbound = next(
                (m for m in thread_msgs if "SENT" not in (m.get("labelIds") or [])),
                thread_msgs[0],
            )
            recipient = extract_email(header(inbound, "From"))

        for m in thread_msgs:
            if "SENT" in (m.get("labelIds") or []):
                continue
            kind = classify(m, account)
            if kind == "self":
                continue
            results.append(
                {
                    "thread_id": tid,
                    "account": account,
                    "recipient": recipient,
                    "gmail_id": m.get("id"),
                    "sender": extract_email(header(m, "From")) or header(m, "From"),
                    "sender_display": header(m, "From"),
                    "subject": header(m, "Subject"),
                    "body": body_text(m)[:2000],
                    "date": header(m, "Date"),
                    "internal_date_ms": int(m.get("internalDate") or 0),
                    "kind": kind,
                }
            )

    out_file.write_text(json.dumps(results, indent=2))

    counts: dict[str, int] = {}
    for r in results:
        counts[r["kind"]] = counts.get(r["kind"], 0) + 1
    print(f"wrote {len(results)} classified replies → {out_file}")
    print(f"counts: {counts}")


if __name__ == "__main__":
    main()
