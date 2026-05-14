"""Coveo-only discovery: paginate a search query and write urlkey+metadata.

Doesn't touch the rate-limited profile API. Output JSON file lists every
unique urlkey for the query, with the search-time metadata (name, job,
company, location, degree, school). A separate fill step does the actual
profile/email lookup later.

Usage:
  python stanford_alumni_discover.py <query> [out_json]
"""
import json
import os
import sys
import time
import urllib.request
import websocket

CDP_HOST = "http://127.0.0.1:9222"
QUERY = sys.argv[1] if len(sys.argv) > 1 else "retail"
OUT_PATH = sys.argv[2] if len(sys.argv) > 2 else os.path.expanduser(
    f"~/Downloads/stanford_alumni_{QUERY}.discover.json"
)
PAGE_SIZE = 500

try:
    sys.stdout.reconfigure(line_buffering=True)
except Exception:
    pass


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


def page_eval(ws, expression):
    res = cdp(ws, "Runtime.evaluate", {
        "expression": expression, "returnByValue": True,
        "awaitPromise": True, "timeout": 60000,
    })
    if "exceptionDetails" in res:
        raise RuntimeError(f"JS error: {res['exceptionDetails']}")
    return res["result"].get("value")


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
          school: (x.raw||{{}}).stanfordschool,
        }})),
      }};
    }})()
    """
    return page_eval(ws, js)


def main():
    ws = get_page_ws()
    try:
        all_by_key = {}
        first = 0
        total = None
        while True:
            print(f"[+] coveo q={QUERY!r} firstResult={first}")
            sr = coveo_search(ws, QUERY, first, PAGE_SIZE)
            total = sr["totalCount"]
            results = sr["results"]
            new_in_page = 0
            for r in results:
                k = r.get("urlkey")
                if not k or k in all_by_key:
                    continue
                all_by_key[k] = r
                new_in_page += 1
            print(f"    +{new_in_page} new (running total: {len(all_by_key)} / coveo totalCount={total})")
            if not results or first + PAGE_SIZE >= total:
                break
            first += PAGE_SIZE
            time.sleep(0.5)
        with open(OUT_PATH, "w") as f:
            json.dump({"query": QUERY, "total": total, "results": list(all_by_key.values())}, f, indent=2)
        print(f"[+] wrote {len(all_by_key)} unique results -> {OUT_PATH}")
    finally:
        ws.close()


if __name__ == "__main__":
    main()
