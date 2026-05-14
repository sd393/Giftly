#!/usr/bin/env python3
"""Phase 1: scrape source URLs to extract ~1,600 unique retailer domains.

Pipeline (see ~/Downloads/Phase 1 - Domain Search.md for full doc):
  Phase A: HTTP-fetch each URL in ~/Downloads/source_urls_for_claude_code.md,
           strip junk HTML, send to GPT-5.2 (Responses API, no web_search) to
           extract retailers + domains.
  Phase B: If A < 1600, run web_search_preview queries for thin categories
           and to top up.

Dedup: against the running set + existing 100 (retail_targets_100.csv,
retail_emails_3x_details.csv). Snapshot to disk after every URL/query —
crash-safe and `--resume` skips already-done items via progress.json.

Usage:
    .venv/bin/python3 scrape-retailers.py [--resume] [--limit N] [-v]
                                          [--phase a|b|both]
                                          [--target N]
"""
import csv
import json
import os
import re
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).parent
LOG_DIR = ROOT / "logs"

SOURCE_MD = Path.home() / "Downloads" / "source_urls_for_claude_code.md"
OUT_CSV = Path.home() / "Downloads" / "retail_domains_1600.csv"
PROGRESS_JSON = Path.home() / "Downloads" / "retail_domains_1600.progress.json"
EXISTING_TARGETS = Path.home() / "Downloads" / "retail_targets_100.csv"
EXISTING_DETAILS = Path.home() / "Downloads" / "retail_emails_3x_details.csv"

DEFAULT_TARGET = 1600
PROGRESS_EVERY_DOMAINS = 50
PROGRESS_EVERY_SECONDS = 120

# --- env loader (.env.local fallback) ------------------------------------


def _load_env_local() -> None:
    candidates = [
        ROOT.parent / ".env.local",
        Path.home() / "Documents" / "Code" / "Spring_2026" / "Giftly" / ".env.local",
        ROOT / ".env",
    ]
    for path in candidates:
        if not path.exists():
            continue
        try:
            for line in path.read_text().splitlines():
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, _, v = line.partition("=")
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                if k and v and k not in os.environ:
                    os.environ[k] = v
        except Exception:
            pass


_load_env_local()

MODEL = os.environ.get("OPENAI_MODEL", "gpt-5.2")
MODEL_FALLBACKS = ["gpt-5.2", "gpt-5", "gpt-4.1"]


# --- CLI ------------------------------------------------------------------

VERBOSE = "--verbose" in sys.argv or "-v" in sys.argv
RESUME = "--resume" in sys.argv
DRY_RUN = "--dry-run" in sys.argv


def _arg_value(flag: str, default=None, cast=str):
    if flag in sys.argv:
        i = sys.argv.index(flag)
        if i + 1 < len(sys.argv):
            try:
                return cast(sys.argv[i + 1])
            except (ValueError, TypeError):
                return default
    return default


LIMIT = _arg_value("--limit", None, int)
TARGET = _arg_value("--target", DEFAULT_TARGET, int) or DEFAULT_TARGET
PHASE = _arg_value("--phase", "both", str)


# --- source MD parser ----------------------------------------------------


def parse_source_md(path: Path) -> tuple[list[tuple[str, str, str]], list[tuple[str, str]]]:
    """Returns (urls, queries).
    urls: [(category, url, note_from_preceding_comment)]
    queries: [(category, query_text)] — pulled from `# - "..."` lines under
             `Search queries` blocks.
    """
    urls: list[tuple[str, str, str]] = []
    queries: list[tuple[str, str]] = []
    if not path.exists():
        return urls, queries
    current_category = "Uncategorized"
    last_comment = ""
    in_search_block = False
    for raw in path.read_text().splitlines():
        line = raw.strip()
        # Skip blank lines but reset comment context
        if not line:
            in_search_block = False
            continue
        # Category headers: `## CATEGORY N: ...` (also handle `## ===...`)
        m = re.match(r"^##\s+CATEGORY\s+\d+:?\s*(.+?)\s*$", line, re.IGNORECASE)
        if m:
            current_category = m.group(1).strip().rstrip("=").strip()
            in_search_block = False
            continue
        # Other markdown headers / divider rows — ignore
        if re.match(r"^##\s*=+", line) or line.startswith("# ===="):
            continue
        # URL line (bare http/https)
        m = re.match(r"^(https?://\S+)$", line)
        if m:
            urls.append((current_category, m.group(1), last_comment))
            last_comment = ""
            in_search_block = False
            continue
        # Search-query block detector
        if re.search(r"search\s+queries?", line, re.IGNORECASE) and line.startswith("#"):
            in_search_block = True
            last_comment = ""
            continue
        # `# - "query"` lines under a search block
        m = re.match(r'^#\s*-\s*"(.+?)"\s*$', line)
        if m and in_search_block:
            queries.append((current_category, m.group(1)))
            continue
        # Plain comment — keep as note for next URL
        if line.startswith("# "):
            last_comment = line[2:].strip()
            continue
    return urls, queries


# --- HTML fetch + clean --------------------------------------------------


UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/126.0 Safari/537.36"
)


def fetch_html(url: str, timeout: float = 20.0) -> tuple[str | None, str | None]:
    """Returns (html, error). Caps at 5MB, requires text/html-ish content."""
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": UA,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        })
        with urllib.request.urlopen(req, timeout=timeout) as r:
            ct = (r.headers.get("Content-Type") or "").lower()
            if "html" not in ct and "xml" not in ct and ct:
                return None, f"non-html content-type: {ct[:60]}"
            data = r.read(5_000_000)
        return data.decode("utf-8", errors="replace"), None
    except urllib.error.HTTPError as e:
        return None, f"HTTPError {e.code}"
    except urllib.error.URLError as e:
        return None, f"URLError: {str(e.reason)[:80]}"
    except Exception as e:
        return None, f"{type(e).__name__}: {str(e)[:80]}"


def clean_html(html: str, max_chars: int = 100_000) -> str:
    """Strip scripts/styles/comments and condense whitespace. Cap length."""
    h = html
    h = re.sub(r"<script\b[^>]*>.*?</script>", " ", h, flags=re.DOTALL | re.IGNORECASE)
    h = re.sub(r"<style\b[^>]*>.*?</style>", " ", h, flags=re.DOTALL | re.IGNORECASE)
    h = re.sub(r"<noscript\b[^>]*>.*?</noscript>", " ", h, flags=re.DOTALL | re.IGNORECASE)
    h = re.sub(r"<svg\b[^>]*>.*?</svg>", " ", h, flags=re.DOTALL | re.IGNORECASE)
    h = re.sub(r"<!--.*?-->", " ", h, flags=re.DOTALL)
    h = re.sub(r"\s+", " ", h)
    return h[:max_chars]


# --- LLM extraction ------------------------------------------------------


EXTRACTION_SYSTEM_PROMPT = """You extract retailer information from a webpage's HTML.

DEFINITIONS
- "Retailer" = a multi-brand store, marketplace, curator, hybrid retailer/brand, or specialty shop that sells products from MULTIPLE brands. Department stores, online marketplaces, curated boutiques, niche specialists (outdoor, beauty, wine, pet, etc.) ALL count.
- "Pure DTC brand" (mark is_pure_dtc=true) = a brand that sells primarily its own single-brand catalog (e.g., Patagonia, Allbirds, Glossier, Warby Parker, single-line CPG brands).
- Hybrid retailer/brand (is_pure_dtc=false) = sells own line + third-party brands (Anthropologie, Madewell, J.Crew, Free People). LEAN TOWARD INCLUDING these.

EXTRACTION RULES
1. ONLY extract entities EXPLICITLY mentioned on the page. Do not pull from your own knowledge if the entity is not on the page.
2. NEVER hallucinate domains. If the page hyperlinks the retailer's site, capture the exact domain. If the retailer is mentioned by name only with no outbound link, you may set the domain only when it's an obvious, well-known one — and you MUST set "domain_inferred": true.
3. Domain format: bare root domain, lowercase, no scheme, no www, no path/query (e.g., "rei.com", not "https://www.rei.com/path").
4. Skip media/blogs/aggregators that aren't themselves retailers (e.g., Vogue, Refinery29, Beauty Independent, Imbibe Magazine — these are publishers, not retailers).
5. Skip anything that's clearly not e-commerce: physical-only stores with no online presence, defunct businesses, listing aggregators.
6. Include pure-DTC brands you find but mark is_pure_dtc=true so the caller can filter; do NOT silently drop them.

OUTPUT
Return ONE JSON object, no prose, no markdown fences:
{
  "retailers": [
    {
      "company_name": "<string>",
      "domain": "<bare root domain or null>",
      "domain_inferred": <bool, default false>,
      "is_pure_dtc": <bool, your best assessment>,
      "notes": "<optional one-line description from the page>"
    }
  ]
}

If the page is empty, a CAPTCHA challenge, or unrelated to retailers, return {"retailers": []}.
"""


def extract_from_html(client, html: str, url: str, category: str, page_note: str,
                      model: str) -> tuple[list[dict], str | None]:
    user_msg = (
        f"URL: {url}\n"
        f"Category context: {category}\n"
        f"Page note: {page_note or '(none)'}\n\n"
        f"Page content (cleaned HTML, may be truncated to 100KB):\n{html}\n\n"
        f"Extract retailers per system instructions. Output JSON only."
    )
    try:
        resp = client.responses.create(
            model=model,
            instructions=EXTRACTION_SYSTEM_PROMPT,
            input=user_msg,
        )
    except Exception as e:
        return [], f"api_error: {type(e).__name__}: {str(e)[:120]}"
    text = (getattr(resp, "output_text", "") or "").strip()
    if not text:
        return [], "empty_response"
    m = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if not m:
        return [], f"no_json: {text[:120]}"
    try:
        data = json.loads(m.group(0))
    except json.JSONDecodeError as e:
        return [], f"bad_json: {e}"
    return data.get("retailers", []) or [], None


# --- web search fallback (Phase B) ---------------------------------------


SEARCH_SYSTEM_PROMPT = """You are finding multi-brand retailers (NOT pure-DTC brands) for a specific vertical.

Use the web_search tool aggressively to find as many retailers as you can that match the user's query. For each one, return:
- company_name
- domain (bare root, lowercase, no www/path)
- domain_inferred (false if you saw the domain on the web; true if you guessed from the name)
- is_pure_dtc (true if it primarily sells its own single brand; false if multi-brand or hybrid)
- notes (one-line description)

DEFINITIONS — same as the page-extraction prompt:
- Retailer = multi-brand store, marketplace, curator, hybrid retailer/brand. Include hybrids.
- Pure DTC = single-brand catalog. Include but flag.

RULES
- Aim for 30-50 results per query. Prefer breadth over depth.
- Verify domains via web search; do not invent.
- Never include media/blogs/aggregators that aren't themselves retailers.

OUTPUT — one JSON object, no prose:
{"retailers": [{"company_name": ..., "domain": ..., "domain_inferred": ..., "is_pure_dtc": ..., "notes": ...}, ...]}
"""


def search_for_retailers(client, query: str, category: str, model: str) -> tuple[list[dict], str | None]:
    user_msg = (
        f"Vertical / category: {category}\n"
        f"Query: {query}\n\n"
        f"Find as many retailers (multi-brand, not pure DTC) as possible matching this query. "
        f"Use web search. Return the JSON object per system instructions."
    )
    try:
        resp = client.responses.create(
            model=model,
            instructions=SEARCH_SYSTEM_PROMPT,
            input=user_msg,
            tools=[{"type": "web_search_preview"}],
        )
    except Exception as e:
        return [], f"api_error: {type(e).__name__}: {str(e)[:120]}"
    text = (getattr(resp, "output_text", "") or "").strip()
    if not text:
        return [], "empty_response"
    m = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if not m:
        return [], f"no_json: {text[:120]}"
    try:
        data = json.loads(m.group(0))
    except json.JSONDecodeError as e:
        return [], f"bad_json: {e}"
    return data.get("retailers", []) or [], None


# --- domain normalize + existing-set loader ------------------------------


def normalize_domain(d: str | None) -> str | None:
    if not d or not isinstance(d, str):
        return None
    d = d.strip().lower()
    d = re.sub(r"^https?://", "", d)
    d = d.split("/", 1)[0].split("?", 1)[0]
    if d.startswith("www."):
        d = d[4:]
    if "." not in d or " " in d or "@" in d:
        return None
    # strip common subdomain prefixes (mirror find-emails.root_domain logic)
    parts = d.split(".")
    if len(parts) > 2 and parts[0] in {
        "shop", "store", "us", "uk", "ca", "eu", "global", "the", "get", "try", "my", "app"
    }:
        d = ".".join(parts[1:])
    return d


def load_existing_domains() -> set[str]:
    out: set[str] = set()
    if EXISTING_TARGETS.exists():
        with EXISTING_TARGETS.open() as f:
            for r in csv.DictReader(f):
                d = normalize_domain(r.get("Website") or "")
                if d:
                    out.add(d)
    if EXISTING_DETAILS.exists():
        with EXISTING_DETAILS.open() as f:
            for r in csv.DictReader(f):
                d = normalize_domain(r.get("domain") or "")
                if d:
                    out.add(d)
    return out


# --- IO ------------------------------------------------------------------


FIELDS = [
    "company_name", "domain", "is_pure_dtc", "domain_inferred",
    "category", "source_url", "notes",
]


def save_csv(rows: list[dict]) -> None:
    if DRY_RUN:
        return
    tmp = OUT_CSV.with_suffix(OUT_CSV.suffix + ".tmp")
    with tmp.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in FIELDS})
    tmp.replace(OUT_CSV)


def save_progress(progress: dict) -> None:
    if DRY_RUN:
        return
    tmp = PROGRESS_JSON.with_suffix(PROGRESS_JSON.suffix + ".tmp")
    tmp.write_text(json.dumps(progress, indent=2, sort_keys=True))
    tmp.replace(PROGRESS_JSON)


# --- model resolution (graceful fallback if gpt-5.2 not available) ------


def resolve_model(client) -> str:
    """Return the first model from MODEL_FALLBACKS (or env override) that
    actually responds. Tested with a tiny 1-token call so we don't waste
    minutes on a model the account can't access."""
    candidates = [MODEL] + [m for m in MODEL_FALLBACKS if m != MODEL]
    seen = set()
    for m in candidates:
        if m in seen:
            continue
        seen.add(m)
        try:
            client.responses.create(
                model=m,
                input="OK",
                max_output_tokens=16,
            )
            return m
        except Exception:
            continue
    raise RuntimeError(
        f"None of {candidates} are accessible. Check OPENAI_API_KEY and model "
        f"availability."
    )


# --- main ----------------------------------------------------------------


def main() -> None:
    if not os.environ.get("OPENAI_API_KEY"):
        print("ERROR: OPENAI_API_KEY not set. Add to ../.env.local or shell env.",
              file=sys.stderr)
        sys.exit(1)
    try:
        import openai
    except ImportError:
        print("ERROR: openai not installed. Run: .venv/bin/pip install openai",
              file=sys.stderr)
        sys.exit(1)

    LOG_DIR.mkdir(exist_ok=True)
    log_path = LOG_DIR / "scrape-retailers.log"
    log_f = log_path.open("a")
    started = time.time()

    def log(line: str) -> None:
        log_f.write(line + "\n")
        log_f.flush()
        if VERBOSE:
            print(line, flush=True)

    urls, queries = parse_source_md(SOURCE_MD)
    if not urls and not queries:
        print(f"ERROR: source MD empty or unparseable: {SOURCE_MD}", file=sys.stderr)
        sys.exit(1)

    existing = load_existing_domains()
    seen_domains: set[str] = set(existing)
    rows: list[dict] = []
    progress: dict = {}

    if RESUME:
        if PROGRESS_JSON.exists():
            try:
                progress = json.loads(PROGRESS_JSON.read_text())
            except json.JSONDecodeError:
                progress = {}
        if OUT_CSV.exists():
            with OUT_CSV.open() as f:
                for r in csv.DictReader(f):
                    rows.append(r)
                    d = normalize_domain(r.get("domain") or "")
                    if d:
                        seen_domains.add(d)

    client = openai.OpenAI()
    try:
        active_model = resolve_model(client)
    except Exception as e:
        print(f"ERROR resolving model: {e}", file=sys.stderr)
        sys.exit(1)

    banner = (
        f"model={active_model} target={TARGET} source-urls={len(urls)} "
        f"search-queries={len(queries)} existing-dedup={len(existing)} "
        f"phase={PHASE} resume={'yes' if RESUME else 'no'}"
    )
    if RESUME:
        banner += f" already-in-csv={len(rows)} done-keys={len(progress)}"
    print(banner, flush=True)
    log(banner)

    last_progress_count = 0
    last_progress_time = time.time()

    def maybe_print_progress(stage: str, force: bool = False) -> None:
        nonlocal last_progress_count, last_progress_time
        n = len(rows)
        elapsed = int(time.time() - started)
        if force or (
            n - last_progress_count >= PROGRESS_EVERY_DOMAINS
            or time.time() - last_progress_time >= PROGRESS_EVERY_SECONDS
        ):
            last_progress_count = (n // PROGRESS_EVERY_DOMAINS) * PROGRESS_EVERY_DOMAINS
            last_progress_time = time.time()
            ok_keys = sum(1 for v in progress.values() if v.get("status") == "ok")
            print(
                f"[progress] stage={stage} unique={n} target={TARGET} "
                f"ok-sources={ok_keys}/{len(progress)} elapsed={elapsed}s",
                flush=True,
            )

    def absorb_retailers(extracted: list[dict], category: str, source_id: str) -> int:
        added = 0
        for r in extracted:
            domain = normalize_domain(r.get("domain"))
            if not domain:
                continue
            if domain in seen_domains:
                continue
            if r.get("is_pure_dtc") is True:
                # Skip pure DTC by default; flag retained in flag column for filtered passes
                continue
            seen_domains.add(domain)
            rows.append({
                "company_name": (r.get("company_name") or "").strip()[:200],
                "domain": domain,
                "is_pure_dtc": "false",
                "domain_inferred": "true" if r.get("domain_inferred") else "false",
                "category": category,
                "source_url": source_id,
                "notes": (r.get("notes") or "").strip()[:300],
            })
            added += 1
        return added

    # ---- Phase A: HTML scrape ----------------------------------------
    if PHASE in ("a", "both") and urls:
        log("=== Phase A: HTML scrape ===")
        targets_a = urls[:LIMIT] if LIMIT else urls
        for i, (category, url, note) in enumerate(targets_a, 1):
            if len(rows) >= TARGET:
                break
            if url in progress:
                log(f"[A {i:>2}/{len(targets_a)}] {url[:70]} SKIP (already done)")
                continue
            log(f"[A {i:>2}/{len(targets_a)}] {category[:30]:<30} {url[:60]}")
            html, fetch_err = fetch_html(url)
            if fetch_err:
                progress[url] = {"status": "fetch_fail", "error": fetch_err, "count": 0}
                log(f"   fetch fail: {fetch_err[:100]}")
                save_progress(progress)
                if not VERBOSE:
                    print(f"  [A {i}/{len(targets_a)}] {category[:24]:<24} {url[:50]:<50} FETCH FAIL ({fetch_err[:40]})", flush=True)
                continue
            cleaned = clean_html(html)
            if len(cleaned) < 500:
                progress[url] = {"status": "too_short", "count": 0, "len": len(cleaned)}
                log(f"   too short ({len(cleaned)} chars)")
                save_progress(progress)
                if not VERBOSE:
                    print(f"  [A {i}/{len(targets_a)}] {category[:24]:<24} {url[:50]:<50} TOO SHORT", flush=True)
                continue
            extracted, ext_err = extract_from_html(client, cleaned, url, category, note, active_model)
            if ext_err:
                progress[url] = {"status": "extract_fail", "error": ext_err, "count": 0}
                log(f"   extract fail: {ext_err[:120]}")
                save_progress(progress)
                if not VERBOSE:
                    print(f"  [A {i}/{len(targets_a)}] {category[:24]:<24} {url[:50]:<50} EXTRACT FAIL", flush=True)
                continue
            added = absorb_retailers(extracted, category, url)
            progress[url] = {"status": "ok", "raw": len(extracted), "count": added}
            save_progress(progress)
            save_csv(rows)
            line = (
                f"  [A {i}/{len(targets_a)}] {category[:24]:<24} "
                f"{url[:50]:<50} +{added} (raw {len(extracted)}, total {len(rows)})"
            )
            log(line.strip())
            if not VERBOSE:
                print(line, flush=True)
            maybe_print_progress("A")
            time.sleep(0.4)

    # ---- Phase B: web search fallback --------------------------------
    if PHASE in ("b", "both") and len(rows) < TARGET and queries:
        log(f"=== Phase B: web search ({TARGET - len(rows)} domains needed) ===")
        targets_b = queries[:LIMIT] if LIMIT else queries
        for i, (category, query) in enumerate(targets_b, 1):
            if len(rows) >= TARGET:
                break
            key = f"search:{query}"
            if key in progress:
                log(f"[B {i:>2}/{len(targets_b)}] {key[:80]} SKIP (already done)")
                continue
            log(f"[B {i:>2}/{len(targets_b)}] {category[:30]:<30} q={query[:50]}")
            extracted, ext_err = search_for_retailers(client, query, category, active_model)
            if ext_err:
                progress[key] = {"status": "search_fail", "error": ext_err, "count": 0}
                log(f"   search fail: {ext_err[:120]}")
                save_progress(progress)
                if not VERBOSE:
                    print(f"  [B {i}/{len(targets_b)}] {category[:24]:<24} q={query[:40]:<40} SEARCH FAIL", flush=True)
                continue
            added = absorb_retailers(extracted, category, key)
            progress[key] = {"status": "ok", "raw": len(extracted), "count": added}
            save_progress(progress)
            save_csv(rows)
            line = (
                f"  [B {i}/{len(targets_b)}] {category[:24]:<24} "
                f"q={query[:40]:<40} +{added} (raw {len(extracted)}, total {len(rows)})"
            )
            log(line.strip())
            if not VERBOSE:
                print(line, flush=True)
            maybe_print_progress("B")
            time.sleep(0.6)

    # ---- final summary ----------------------------------------------
    maybe_print_progress("done", force=True)
    elapsed = int(time.time() - started)
    ok_a = sum(1 for k, v in progress.items()
               if not k.startswith("search:") and v.get("status") == "ok")
    ok_b = sum(1 for k, v in progress.items()
               if k.startswith("search:") and v.get("status") == "ok")
    fail = sum(1 for v in progress.values() if v.get("status") != "ok")
    short_tag = " (UNDER TARGET)" if len(rows) < TARGET else ""
    print(
        f"\n=== Phase 1 complete ===\n"
        f"unique-new-domains={len(rows)} target={TARGET}{short_tag}\n"
        f"phase-a-ok={ok_a} phase-b-ok={ok_b} failed-keys={fail}\n"
        f"elapsed={elapsed}s log={log_path.relative_to(ROOT)}\n"
        f"out={OUT_CSV}\n"
        f"progress={PROGRESS_JSON}",
        flush=True,
    )
    log_f.close()


if __name__ == "__main__":
    main()
