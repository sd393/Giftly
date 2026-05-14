"""Repair + extend a Stanford alumni CSV.

Two passes:
  1. Refetch profile API for all rows with empty emails_all (rate-limit drops)
  2. Paginate Coveo across all pages of `query` and fetch profiles for any
     urlkey not already in the CSV.

Both passes share the same rate-limit-aware profile fetcher with
exponential backoff on 403 "Too many requests" responses.

Checkpoints the CSV every CHECKPOINT_EVERY rows so progress is durable.

Usage:
  python stanford_alumni_repair.py [csv_path] [query]
"""
import csv
import json
import os
import sys
import time
import urllib.request
import websocket

CDP_HOST = "http://127.0.0.1:9222"
CSV_PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser(
    "~/Downloads/stanford_alumni_ecommerce.csv"
)
QUERY = sys.argv[2] if len(sys.argv) > 2 else "retail"

PAGE_SIZE = 500          # Coveo per-page max
BASE_DELAY_S = 1.5       # between profile calls when healthy
BACKOFF_SCHEDULE = [15, 30, 60, 120]  # on consecutive 403s — shorter ramps
CHECKPOINT_EVERY = 25
# Force line-buffered stdout so progress is visible even when piped to a file.
import sys as _sys
try:
    _sys.stdout.reconfigure(line_buffering=True)
except Exception:
    pass

FIELDS = [
    "name", "registration_name", "urlkey",
    "job_title", "company", "location", "degree", "school",
    "email_saa", "email_gsb", "email_business", "email_personal",
    "emails_all", "profile_url",
]


def get_page_ws():
    tabs = json.loads(urllib.request.urlopen(f"{CDP_HOST}/json/list", timeout=5).read())
    page = next(
        (t for t in tabs if t.get("type") == "page" and "alumnidirectory.stanford.edu" in t.get("url", "")),
        None,
    )
    if not page:
        sys.exit("No alumnidirectory.stanford.edu tab found.")
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


def get_username(ws):
    return page_eval(ws, """
    (async () => {
      const r = await fetch('/api/auth/session', {credentials:'include'});
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
          name: x.title,
          urlkey: (x.raw||{{}}).urlkey,
          job: (x.raw||{{}}).primaryorcurrentjobtitle,
          company: (x.raw||{{}}).primaryorcurrentcompany,
          location: (x.raw||{{}}).homelocation,
          degree: ((x.raw||{{}}).externaldegreestring||[]).join('; '),
          school: (x.raw||{{}}).stanfordschool,
        }})),
      }};
    }})()
    """
    return page_eval(ws, js)


def fetch_profile_raw(ws, urlkey, username):
    """Returns dict with status + parsed body (or text snippet on parse fail)."""
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


def fetch_profile_with_backoff(ws, urlkey, username, label=""):
    """Fetch profile with backoff schedule on 403. Returns parsed body or None."""
    for attempt, wait in enumerate([0] + BACKOFF_SCHEDULE):
        if wait:
            print(f"    [{label}] 403 received, sleeping {wait}s before retry {attempt}...")
            time.sleep(wait)
        res = fetch_profile_raw(ws, urlkey, username)
        status = res.get("status")
        if status == 200:
            return res.get("parsed")
        if status != 403:
            print(f"    [{label}] HTTP {status}; giving up. body={res.get('text','')[:120]}")
            return None
        # else 403 → loop and back off
    print(f"    [{label}] still 403 after {len(BACKOFF_SCHEDULE)} retries; skipping")
    return None


def profile_to_row(name_fallback, urlkey, search_meta, parsed):
    """Combine search metadata + profile API response into a CSV row."""
    contact = (parsed or {}).get("contact") or {}
    name_obj = (contact.get("name") or {}) if isinstance(contact, dict) else {}
    emails = (parsed or {}).get("emails") or []
    by_type = {e.get("type"): e.get("emailAddress") for e in emails}
    return {
        "name": name_obj.get("digitalName") or name_fallback,
        "registration_name": name_obj.get("registrationNameString") or "",
        "urlkey": urlkey,
        "job_title": (search_meta or {}).get("job") or "",
        "company": (search_meta or {}).get("company") or "",
        "location": (search_meta or {}).get("location") or "",
        "degree": (search_meta or {}).get("degree") or "",
        "school": (search_meta or {}).get("school") or "",
        "email_saa": by_type.get("SAA Email", ""),
        "email_gsb": by_type.get("GSB Email", ""),
        "email_business": by_type.get("Business Email", ""),
        "email_personal": by_type.get("Personal Email", ""),
        "emails_all": "; ".join(f"{e.get('type')}: {e.get('emailAddress')}" for e in emails),
        "profile_url": f"https://alumnidirectory.stanford.edu/profile/{urlkey}",
    }


def write_csv(path, rows_by_key, key_order):
    tmp = path + ".tmp"
    with open(tmp, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        for key in key_order:
            r = rows_by_key.get(key)
            if r:
                w.writerow({k: r.get(k, "") for k in FIELDS})
    os.replace(tmp, path)


def main():
    ws = get_page_ws()
    try:
        username = get_username(ws)
        print(f"[+] auth ok, username={username!r}")

        # Load existing CSV (preserve order)
        rows_by_key = {}
        key_order = []
        with open(CSV_PATH, newline="", encoding="utf-8") as f:
            for r in csv.DictReader(f):
                k = r.get("urlkey")
                if not k:
                    continue
                rows_by_key[k] = r
                key_order.append(k)
        existing_keys = set(rows_by_key.keys())
        empty_keys = [k for k in key_order if not rows_by_key[k].get("emails_all")]
        print(f"[+] CSV: {len(key_order)} rows, {len(empty_keys)} empty-email rows to repair")

        # Pass 0: paginate Coveo for `query` to discover all urlkeys
        new_meta = {}  # urlkey -> search metadata for rows we still need to fetch
        first = 0
        seen_total = None
        while True:
            print(f"[+] coveo q={QUERY!r} firstResult={first}")
            sr = coveo_search(ws, QUERY, first, PAGE_SIZE)
            seen_total = sr["totalCount"]
            results = sr["results"]
            if not results:
                break
            new_in_page = 0
            for r in results:
                k = r.get("urlkey")
                if not k:
                    continue
                if k in existing_keys:
                    continue
                if k in new_meta:
                    continue
                new_meta[k] = r
                new_in_page += 1
            print(f"    +{new_in_page} new urlkeys (running new total: {len(new_meta)}; coveo totalCount={seen_total})")
            first += PAGE_SIZE
            if first >= seen_total:
                break
            time.sleep(0.5)

        print(f"[+] discovered {len(new_meta)} new urlkeys to fetch")
        print(f"[+] todo: repair {len(empty_keys)} + new {len(new_meta)} = {len(empty_keys) + len(new_meta)} profile API calls")

        # Build the queue: (key, search_meta_or_existing_row, label)
        # For repair, we use the existing row's metadata (fall back to empty)
        def existing_meta(row):
            return {
                "job": row.get("job_title", ""),
                "company": row.get("company", ""),
                "location": row.get("location", ""),
                "degree": row.get("degree", ""),
                "school": row.get("school", ""),
            }

        queue = []
        for k in empty_keys:
            queue.append(("repair", k, existing_meta(rows_by_key[k]), rows_by_key[k].get("name", "")))
        for k, m in new_meta.items():
            queue.append(("new", k, m, m.get("name", "")))

        print(f"[+] starting profile API loop, {BASE_DELAY_S}s between calls\n")
        ok = err = three3 = 0
        for i, (kind, urlkey, meta, name) in enumerate(queue, 1):
            label = f"{i}/{len(queue)} {kind} {name[:30]}"
            parsed = fetch_profile_with_backoff(ws, urlkey, username, label)
            if parsed is None or "emails" not in (parsed or {}):
                err += 1
                if kind == "new":
                    # write a placeholder so we know we tried; can be re-repaired later
                    rows_by_key[urlkey] = {
                        "name": name, "urlkey": urlkey,
                        **{f: "" for f in FIELDS if f not in ("name","urlkey")},
                        "profile_url": f"https://alumnidirectory.stanford.edu/profile/{urlkey}",
                        "job_title": meta.get("job",""), "company": meta.get("company",""),
                        "location": meta.get("location",""), "degree": meta.get("degree",""),
                        "school": meta.get("school",""),
                    }
                    if urlkey not in key_order:
                        key_order.append(urlkey)
            else:
                row = profile_to_row(name, urlkey, meta, parsed)
                rows_by_key[urlkey] = row
                if urlkey not in key_order:
                    key_order.append(urlkey)
                ok += 1
            if i % 10 == 0 or i == len(queue):
                preview = (parsed or {}).get("emails", [])
                preview_email = preview[0]["emailAddress"] if preview else "(no email)"
                print(f"  {i:>4}/{len(queue)} {name[:32]:<32} {preview_email}")
            if i % CHECKPOINT_EVERY == 0:
                write_csv(CSV_PATH, rows_by_key, key_order)
                print(f"    [checkpoint] wrote {len(key_order)} rows ({ok} ok, {err} err so far)")
            time.sleep(BASE_DELAY_S)

        write_csv(CSV_PATH, rows_by_key, key_order)
        print(f"\n[+] DONE — final CSV: {len(key_order)} rows ({ok} fetched ok, {err} errors)")

    finally:
        ws.close()


if __name__ == "__main__":
    main()
