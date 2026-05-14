"""Scrape Stanford Alumni Directory: one row per unique person, best email each.

Pre-reqs:
  - Chrome launched with --remote-debugging-port=9222 --remote-allow-origins=*
  - User signed into Stanford Pass
  - websocket-client installed in the venv

Usage:
  python stanford_alumni_scrape.py <query> [--repair-from <csv>]
  python stanford_alumni_scrape.py --no-search --repair-from <csv>

  <query>                Coveo search term (positional, optional with --no-search)
  --repair-from <csv>    Also enqueue urlkeys from rows in <csv> with empty emails_all
  --out <csv>            Target outreach CSV (default ~/Downloads/stanford_alumni_outreach.csv)
  --no-search            Skip Coveo phase (use with --repair-from for repair-only)

Behavior:
  - Dedups by urlkey against the target outreach CSV — already-known people are skipped.
  - For each new urlkey, fetches /api/search/profile, picks one best email,
    appends one row.
  - Email priority is context-aware:
      default (graduated):  Business > Personal > GSB > SAA > Home
      current GSB student:  GSB > Business > Personal > SAA > Home
    A "current GSB student" has a degrees[] entry with
    school='Graduate School of Business' and degreeSocialClassYear >= current_year.
"""
import argparse
import csv
import datetime
import json
import os
import sys
import time
import urllib.request

import websocket

CDP_HOST = "http://127.0.0.1:9222"
PAGE_SIZE = 500
BASE_DELAY_S = 1.5
BACKOFF_SCHEDULE = [15, 30, 60, 120]
CHECKPOINT_EVERY = 25
DEFAULT_OUT = os.path.expanduser("~/Downloads/stanford_alumni_outreach.csv")
CURRENT_YEAR = datetime.datetime.now().year

PRIORITY_DEFAULT = ["Business", "Personal", "GSB", "SAA", "Home"]
PRIORITY_CURRENT_GSB = ["GSB", "Business", "Personal", "SAA", "Home"]

FIELDS = [
    "name", "email", "email_type",
    "job_title", "company", "location", "degree", "school",
    "profile_url", "urlkey", "source_query",
]

try:
    sys.stdout.reconfigure(line_buffering=True)
except Exception:
    pass


# ---- arg parsing ----
parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
parser.add_argument("query", nargs="?", help="Coveo search term")
parser.add_argument("--repair-from", dest="repair_from", default=None,
                    help="CSV file to read urlkeys from (empty-email rows)")
parser.add_argument("--out", default=DEFAULT_OUT, help=f"Output CSV (default {DEFAULT_OUT})")
parser.add_argument("--no-search", dest="no_search", action="store_true",
                    help="Skip Coveo phase (use with --repair-from)")
args = parser.parse_args()

if not args.query and not args.repair_from:
    parser.error("need either a positional query or --repair-from")
if not args.query and not args.no_search and not args.repair_from:
    parser.error("either query or --no-search+--repair-from is required")


# ---- CDP plumbing ----
def get_page_ws():
    tabs = json.loads(urllib.request.urlopen(f"{CDP_HOST}/json/list", timeout=5).read())
    page = next(
        (t for t in tabs if t.get("type") == "page"
         and "alumnidirectory.stanford.edu" in t.get("url", "")),
        None,
    )
    if not page:
        sys.exit("No alumnidirectory.stanford.edu tab found in attached Chrome.")
    return websocket.create_connection(page["webSocketDebuggerUrl"], timeout=30)


_id = [0]


def cdp(ws, method, params=None):
    _id[0] += 1
    rid = _id[0]
    ws.send(json.dumps({"id": rid, "method": method, "params": params or {}}))
    while True:
        msg = json.loads(ws.recv())
        if msg.get("id") == rid:
            if "error" in msg:
                raise RuntimeError(f"CDP {method} error: {msg['error']}")
            return msg["result"]


def page_eval(ws, expression, timeout_ms=120000):
    res = cdp(ws, "Runtime.evaluate", {
        "expression": expression, "returnByValue": True,
        "awaitPromise": True, "timeout": timeout_ms,
    })
    if "exceptionDetails" in res:
        raise RuntimeError(f"JS error: {res['exceptionDetails']}")
    return res["result"].get("value")


# ---- Stanford API wrappers ----
def get_username(ws):
    return page_eval(ws, """
    (async () => {
      const r = await fetch('/api/auth/session', {credentials:'include'});
      if (!r.ok) return null;
      const j = await r.json();
      return [j.firstName, j.lastName].filter(Boolean).join(' ');
    })()
    """)


def coveo_search(ws, query, first_result, page_size):
    js = f"""
    (async () => {{
      const tok = (await (await fetch('/api/search/token', {{credentials:'include'}})).json()).token;
      const body = {{
        locale:'en-US', q:{json.dumps(query)},
        numberOfResults: {page_size}, firstResult: {first_result},
        sortCriteria:'relevancy',
        searchHub:'stanfordgraduateschoolofbusinessproduction51q572xk',
        pipeline:'default', enableQuerySyntax:false,
        fieldsToInclude:['permanentid','externaldegreestring','homelocation',
          'primaryorcurrentjobtitle','primaryorcurrentcompany','stanfordmajor',
          'stanfordschool','urlkey','deceased'],
      }};
      const r = await fetch(
        'https://stanfordgraduateschoolofbusinessproduction51q572xk.org.coveo.com/rest/search/v2?organizationId=stanfordgraduateschoolofbusinessproduction51q572xk',
        {{method:'POST',
          headers:{{'Authorization':'Bearer '+tok,'Content-Type':'application/json'}},
          body: JSON.stringify(body)}}
      );
      const j = await r.json();
      return {{
        totalCount: j.totalCount,
        results: (j.results||[]).map(x => ({{
          name: x.title, urlkey: (x.raw||{{}}).urlkey,
          job: (x.raw||{{}}).primaryorcurrentjobtitle,
          company: (x.raw||{{}}).primaryorcurrentcompany,
          location: (x.raw||{{}}).homelocation,
          degree: ((x.raw||{{}}).externaldegreestring||[]).join('; '),
          school: ((x.raw||{{}}).stanfordschool || []).join('; '),
        }})),
      }};
    }})()
    """
    return page_eval(ws, js)


def fetch_profile_raw(ws, urlkey, username):
    js = f"""
    (async () => {{
      const r = await fetch('/api/search/profile?urlkey=' +
          encodeURIComponent({json.dumps(urlkey)}) +
          '&username=' + encodeURIComponent({json.dumps(username)}),
        {{credentials:'include'}});
      const text = await r.text();
      let parsed = null;
      try {{ parsed = JSON.parse(text); }} catch(e) {{}}
      return {{status: r.status, parsed, text: parsed ? null : text.slice(0,200)}};
    }})()
    """
    return page_eval(ws, js)


def fetch_profile_with_backoff(ws, urlkey, username, label):
    for attempt, wait in enumerate([0] + BACKOFF_SCHEDULE):
        if wait:
            print(f"    [{label}] 403, sleeping {wait}s before retry {attempt}...")
            time.sleep(wait)
        res = fetch_profile_raw(ws, urlkey, username)
        status = res.get("status")
        if status == 200:
            return res.get("parsed")
        if status == 401:
            sys.exit("[fatal] 401 from /api/search/profile — Stanford session expired. Re-auth in Chrome and rerun.")
        if status != 403:
            print(f"    [{label}] HTTP {status}; skipping. body={(res.get('text') or '')[:120]}")
            return None
    print(f"    [{label}] still 403 after backoff chain; skipping")
    return None


# ---- email pick ----
def is_current_gsb_student(parsed, year):
    for d in (parsed or {}).get("degrees") or []:
        school = d.get("school") or ""
        year_str = d.get("degreeSocialClassYear") or ""
        if "Graduate School of Business" in school:
            try:
                if int(year_str) >= year:
                    return True
            except (ValueError, TypeError):
                continue
    return False


def pick_best_email(by_type, current_gsb):
    priority = PRIORITY_CURRENT_GSB if current_gsb else PRIORITY_DEFAULT
    for t in priority:
        addr = by_type.get(f"{t} Email")
        if addr:
            return addr, t
    for label, addr in by_type.items():
        if addr:
            return addr, label.replace(" Email", "").strip() or "Other"
    return "", ""


def parsed_to_row(parsed, urlkey, meta, source_query):
    contact = (parsed or {}).get("contact") or {}
    name_obj = (contact.get("name") or {}) if isinstance(contact, dict) else {}
    emails = (parsed or {}).get("emails") or []
    by_type = {e.get("type"): e.get("emailAddress") for e in emails if e.get("emailAddress")}
    email, email_type = pick_best_email(by_type, is_current_gsb_student(parsed, CURRENT_YEAR))
    school = meta.get("school") or ""
    if isinstance(school, list):
        school = "; ".join(school)
    return {
        "name": name_obj.get("digitalName") or meta.get("name") or "",
        "email": email,
        "email_type": email_type,
        "job_title": meta.get("job") or "",
        "company": meta.get("company") or "",
        "location": meta.get("location") or "",
        "degree": meta.get("degree") or "",
        "school": school,
        "profile_url": f"https://alumnidirectory.stanford.edu/profile/{urlkey}",
        "urlkey": urlkey,
        "source_query": source_query,
    }


# ---- CSV io ----
def load_existing_outreach(path):
    """Load existing outreach CSV, return (rows in current FIELDS schema, urlkey set)."""
    if not os.path.exists(path):
        return [], set()
    rows = []
    keys = set()
    with open(path, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            row = {f_: r.get(f_, "") for f_ in FIELDS}
            if not row["urlkey"] and r.get("profile_url"):
                row["urlkey"] = r["profile_url"].rsplit("/", 1)[-1]
            rows.append(row)
            if row["urlkey"]:
                keys.add(row["urlkey"])
    return rows, keys


def write_full_csv(path, existing_rows, new_rows):
    """Atomic write: existing + new rows, FIELDS schema, header included."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        for r in existing_rows + new_rows:
            w.writerow({k: r.get(k, "") for k in FIELDS})
    os.replace(tmp, path)


def main():
    ws = get_page_ws()
    try:
        username = get_username(ws)
        if not username:
            sys.exit("[fatal] /api/auth/session returned 401 — Stanford session expired. Re-auth in Chrome.")
        print(f"[+] auth ok, username={username!r}")
        print(f"[+] current year for GSB-student detection: {CURRENT_YEAR}")

        existing_rows, seen_keys = load_existing_outreach(args.out)
        print(f"[+] outreach CSV: {len(seen_keys)} existing urlkeys")

        queue = []  # (urlkey, meta, source_label)

        if args.query and not args.no_search:
            first = 0
            new_count = 0
            while True:
                print(f"[+] coveo q={args.query!r} firstResult={first}")
                sr = coveo_search(ws, args.query, first, PAGE_SIZE)
                total = sr["totalCount"]
                results = sr["results"]
                if not results:
                    break
                page_new = 0
                for r in results:
                    k = r.get("urlkey")
                    if not k or k in seen_keys:
                        continue
                    seen_keys.add(k)
                    queue.append((k, r, args.query))
                    page_new += 1
                    new_count += 1
                print(f"    +{page_new} new (running {new_count}; coveo totalCount={total})")
                if first + PAGE_SIZE >= total:
                    break
                first += PAGE_SIZE
                time.sleep(0.5)
            print(f"[+] coveo phase: queued {new_count} new urlkeys")

        if args.repair_from:
            repair_label = f"repair:{os.path.basename(args.repair_from)}"
            added = skipped = 0
            with open(args.repair_from, newline="", encoding="utf-8") as f:
                for r in csv.DictReader(f):
                    k = r.get("urlkey", "")
                    if not k:
                        continue
                    if r.get("emails_all"):  # already has emails — skip
                        continue
                    if k in seen_keys:
                        skipped += 1
                        continue
                    meta = {
                        "name": r.get("name", ""),
                        "job": r.get("job_title", ""),
                        "company": r.get("company", ""),
                        "location": r.get("location", ""),
                        "degree": r.get("degree", ""),
                        "school": r.get("school", ""),
                    }
                    seen_keys.add(k)
                    queue.append((k, meta, repair_label))
                    added += 1
            print(f"[+] repair-from {os.path.basename(args.repair_from)}: +{added} (skipped {skipped} already in outreach)")

        print(f"[+] queue total: {len(queue)} profile fetches\n")

        ok = err = 0
        new_rows = []
        for i, (urlkey, meta, src) in enumerate(queue, 1):
            name = meta.get("name") or ""
            label = f"{i}/{len(queue)} {name[:30]}"
            parsed = fetch_profile_with_backoff(ws, urlkey, username, label)
            if parsed is None:
                err += 1
            else:
                row = parsed_to_row(parsed, urlkey, meta, src)
                new_rows.append(row)
                ok += 1
                if i % 10 == 0 or i == len(queue):
                    preview = row["email"] or "(no email)"
                    print(f"  {i:>4}/{len(queue)} {name[:32]:<32} {preview} [{row['email_type'] or '-'}]")
            if i % CHECKPOINT_EVERY == 0:
                write_full_csv(args.out, existing_rows, new_rows)
                print(f"    [checkpoint] {len(existing_rows) + len(new_rows)} total rows ({ok} ok, {err} err)")
            time.sleep(BASE_DELAY_S)

        write_full_csv(args.out, existing_rows, new_rows)
        print(f"\n[+] DONE — outreach CSV: {len(existing_rows) + len(new_rows)} rows ({ok} fetched ok, {err} errors)")
        print(f"    -> {args.out}")
    finally:
        ws.close()


if __name__ == "__main__":
    main()
