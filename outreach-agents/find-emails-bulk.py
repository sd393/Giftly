#!/usr/bin/env python3
"""Phase 2: bulk-discover up to 3 verified emails per retailer domain.

Reads ~/Downloads/retail_domains_1600.csv (1,491 rows from Phase 1).
For each: discover high-leverage contacts via gpt-5.2 + web_search_preview,
verify via SMTP through Dartmouth VPN, write up to 3 verified rows.

Output is a single CSV — one row per verified email — at
~/Downloads/retail_emails_1600.csv. Resume via progress.json.

Reuses helpers from find-leverage-emails.py via importlib (DISCOVERY_SYSTEM_PROMPT,
discover_user_prompt, build_candidate_queue, verify_candidate,
is_primary_source, probe_email).

Usage:
    .venv/bin/python3 find-emails-bulk.py [--resume] [--limit N] [-v]
                                         [--workers 5] [--max-rate 3]
"""
import argparse
import concurrent.futures
import csv
import importlib.util
import json
import os
import queue
import socket
import sys
import threading
import time
from pathlib import Path

ROOT = Path(__file__).parent
LOG_DIR = ROOT / "logs"

DEFAULT_TARGETS = Path.home() / "Downloads" / "retail_domains_1600.csv"
DEFAULT_OUT = Path.home() / "Downloads" / "retail_emails_1600.csv"
DEFAULT_PROGRESS = Path.home() / "Downloads" / "retail_emails_1600.progress.json"
PROGRESS_EVERY_COMPANIES = 20
PROGRESS_EVERY_SECONDS = 120  # also fire a milestone if 2 min elapsed since last

# rough OpenAI pricing (refined in code from response.usage)
COST_PER_M_INPUT_USD = 5.0
COST_PER_M_OUTPUT_USD = 20.0
COST_PER_WEB_SEARCH_USD = 0.025

# --- env loader (same pattern as find-leverage-emails) -------------------


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

OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-5.2")


# --- import helpers from find-leverage-emails ---------------------------


def _load_find_leverage():
    saved = sys.argv[:]
    sys.argv = [sys.argv[0]]
    try:
        spec = importlib.util.spec_from_file_location(
            "find_leverage", str(ROOT / "find-leverage-emails.py")
        )
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod
    finally:
        sys.argv = saved


fl = _load_find_leverage()
fe = fl.fe  # find-emails helpers transitively loaded

# Plan locks SMTP via Dartmouth VPN. The fl module's USE_SMTP was set to
# False at import (we neutralized argv), so flip it now. probe_email reads
# the module global on every call.
fl.USE_SMTP = True


# --- CLI ----------------------------------------------------------------


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--targets", type=Path, default=DEFAULT_TARGETS)
    p.add_argument("--out", type=Path, default=DEFAULT_OUT)
    p.add_argument("--progress", type=Path, default=DEFAULT_PROGRESS)
    p.add_argument("--workers", type=int, default=5)
    p.add_argument("--max-rate", type=float, default=3.0,
                   help="max SMTP probes per second (global)")
    p.add_argument("--limit", type=int, default=None)
    p.add_argument("--resume", action="store_true")
    p.add_argument("--retry-empty", action="store_true",
                   help="With --resume, also re-process companies that returned "
                        "0 verified emails in a prior run.")
    p.add_argument("--deep", action="store_true",
                   help="Always use the deep discovery prompt + reasoning_effort=high + "
                        "12 candidate patterns per person. ~2x the per-call cost.")
    p.add_argument("--deep-fallback", action="store_true",
                   help="Try default mode first; only fall back to deep mode when "
                        "default returns 0 verified emails. Cost ~2.5x default for "
                        "the 0-fill rows, no overhead for the rest.")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("-v", "--verbose", action="store_true")
    return p.parse_args()


# --- deep-mode prompt + larger candidate queue --------------------------


DEEP_DISCOVERY_SYSTEM_PROMPT = """You find high-leverage contacts at retail companies for cold outreach about integrating AI shopping agents on their online storefront. **Be exhaustive — search aggressively across many sources.**

GOAL
Return up to 12 people at the company who would (a) be likely to RESPOND to a cold email and (b) be the right person to evaluate or implement a shopping-agent integration on their digital storefront.

PRIORITIZE (in order)
1. Decision authority for digital storefront tech: founders, CEOs at small/mid-size companies; VP/Head of E-commerce; VP/Director of Digital; VP/Director of D2C; Head of Online; Chief Digital Officer.
2. Technical implementer who would touch the integration: CTO, VP Engineering, Head of Platform, Head of Product (digital), Head of Innovation/AI/Emerging Tech.
3. Conversion / discovery operators: Head of Growth, Head of Personalization, Head of Site Experience, Head of Customer Experience.
4. At very small companies: Chief of Staff, Founder's Office, Head of Partnerships, EA-to-CEO.

DE-RANK / EXCLUDE
- Marketing managers, brand managers, social/PR/community/content roles.
- Retail store managers, regional managers, anything physical-retail-only.
- HR, recruiting, finance (unless CFO at a small company), legal, IR.
- Generic addresses (hello@, info@, press@, support@). Never return these as "people".

DEEP SEARCH — REQUIRED
Use the web_search tool aggressively. For each candidate person, search MULTIPLE of these sources:
- LinkedIn (executive bios, employees-at-company)
- Twitter/X bios
- The company's own /team, /about, /leadership pages
- Press releases and news articles (Crunchbase, TechCrunch, Bloomberg, Forbes, BoF, etc.)
- Conference speaker lists (Shoptalk, NRF Big Show, RetailX, Web Summit, Money 20/20, etc.)
- Podcast show notes (where executives appeared as guests)
- GitHub commits/profiles (for technical leaders)
- SEC filings (10-K, proxy) for public companies — these list named executives
- Privacy policies / cookie banners (often list a Privacy Officer with a real email)
- Trade publication coverage (RetailDive, Modern Retail, Glossy, Beauty Independent)

EMAIL DISCOVERY — ALSO REQUIRED
For each person, try to find their email VERBATIM on a primary source. Don't give up after one search — try 2–4 distinct queries per person:
- "<full name> <company> email"
- site:linkedin.com "<full name>" "<company>"
- "<full name>" filetype:pdf
- "<company>" privacy officer / data protection officer (often gives a real exec email)
- Press release archives sometimes quote executives with their email

DOMAIN / SUBSIDIARY DETECTIVE WORK
- If the company is part of a parent group (e.g., West Elm → Williams-Sonoma, Inc.), executives may use the PARENT's email domain. Set `corrected_domain` if you find evidence of this.
- Some retailers have a corporate domain different from their consumer site (e.g., bedbath.com vs bedbathandbeyond.com vs corporate.com). Find the email-bearing domain.

EMAIL RULES
- Only set `email_if_known` from a primary source you saw verbatim. Aggregator sites (RocketReach, ContactOut, ZoomInfo, Apollo, Lusha, Hunter) DO NOT count as primary; you can mention them in `leverage_rationale` but `email_if_known` must be null in that case.
- If you don't see the email anywhere, return `email_if_known: null` and let downstream pattern guessing + SMTP verify handle it.

OUTPUT
Return ONE JSON object, no prose, no markdown fences:
{
  "corrected_domain": <string or null>,
  "people": [
    {
      "name": <string>,
      "role": <string>,
      "leverage_rationale": <string, one sentence>,
      "email_if_known": <string or null>,
      "source_url_if_known": <string or null>,
      "confidence": <float 0-1>
    },
    ...
  ]
}

Cap at 12 people. Order highest-leverage first. If genuinely no people are findable (very small private boutique), return fewer or empty list.
"""


# Extended pattern generator — supersedes fe.generate_patterns when --deep.
def deep_patterns(name: str, domain: str) -> list[str]:
    base = fe.generate_patterns(name, domain)
    first, last = fe.split_name(name)
    d = fe.root_domain(domain)
    if not first or not d:
        return base
    extras = []
    if last:
        extras.extend([
            f"{first}-{last}@{d}",        # hyphenated
            f"{last}{first}@{d}",         # last+first concat
            f"{last}.{first[0]}@{d}",     # last.f
            f"{first[0]}.{last}@{d}",     # f.last
            f"{first[0]}{last[0]}@{d}",   # initials
            f"{last}{first[0]}@{d}",      # lastf
            f"{first}-{last[0]}@{d}",     # first-l
        ])
    out = list(base)
    for e in extras:
        if e not in out:
            out.append(e)
    return out


def build_deep_queue(person: dict, domain: str, session_dnt: set[str], cap: int = 12) -> list[tuple[str, str | None]]:
    queue: list[tuple[str, str | None]] = []
    seen = set(session_dnt)
    em = person.get("email_if_known")
    if em and em not in seen:
        if fe.root_domain(em.split("@", 1)[-1]) == domain:
            queue.append((em, person.get("source_url_if_known")))
            seen.add(em)
    for p in deep_patterns(person.get("name", ""), domain):
        if p in seen:
            continue
        queue.append((p, None))
        seen.add(p)
    return queue[:cap]


# --- rate limiter -------------------------------------------------------


class RateLimiter:
    """Token-bucket: at most `rate` acquisitions per second across threads."""
    def __init__(self, rate: float):
        self._interval = 1.0 / max(rate, 0.1)
        self._lock = threading.Lock()
        self._next_ok = 0.0

    def acquire(self) -> None:
        with self._lock:
            now = time.monotonic()
            wait = max(0.0, self._next_ok - now)
            self._next_ok = max(now, self._next_ok) + self._interval
        if wait > 0:
            time.sleep(wait)


# --- DNS validation -----------------------------------------------------


def dns_resolves(domain: str, timeout: float = 5.0) -> bool:
    try:
        import dns.resolver
    except ImportError:
        # Without dnspython we still have socket fallback (A record only)
        try:
            socket.gethostbyname(domain)
            return True
        except socket.gaierror:
            return False
    try:
        dns.resolver.resolve(domain, "MX", lifetime=timeout)
        return True
    except Exception:
        pass
    try:
        dns.resolver.resolve(domain, "A", lifetime=timeout)
        return True
    except Exception:
        return False


# --- discovery + verification (with rate-limited probes) ----------------


def estimate_cost_from_response(resp) -> tuple[int, int, int, float]:
    """Return (input_toks, output_toks, web_search_calls, cost_usd)."""
    usage = getattr(resp, "usage", None)
    in_toks = getattr(usage, "input_tokens", 0) if usage else 0
    out_toks = getattr(usage, "output_tokens", 0) if usage else 0
    # Approximate: count web_search_call output items
    ws_calls = 0
    for item in getattr(resp, "output", []) or []:
        if getattr(item, "type", "") == "web_search_call":
            ws_calls += 1
    cost = (in_toks * COST_PER_M_INPUT_USD / 1_000_000
            + out_toks * COST_PER_M_OUTPUT_USD / 1_000_000
            + ws_calls * COST_PER_WEB_SEARCH_USD)
    return in_toks, out_toks, ws_calls, cost


def discover_with_cost(client, row: dict, deep: bool = False) -> tuple[dict, float, str | None]:
    """Wrap fl.discover_people but also return cost. Returns (result, cost, err).

    When `deep=True`: uses the aggressive prompt + reasoning_effort=high.
    """
    # Inline copy of fl.discover_people but capturing the response object
    import json as _json
    import re as _re
    instructions = DEEP_DISCOVERY_SYSTEM_PROMPT if deep else fl.DISCOVERY_SYSTEM_PROMPT
    create_kwargs = dict(
        model=OPENAI_MODEL,
        instructions=instructions,
        input=fl.discover_user_prompt(row),
        tools=[{"type": "web_search_preview"}],
    )
    # NOTE: dropped reasoning_effort=high — too slow on gpt-5.2, and gpt-4.1
    # doesn't support it anyway. The aggressive deep prompt is sufficient.
    try:
        resp = client.responses.create(**create_kwargs)
    except Exception as e:
        return ({"corrected_domain": None, "people": [],
                 "error": f"api_error: {type(e).__name__}: {str(e)[:120]}"},
                0.0, f"api_error: {type(e).__name__}")
    _, _, _, cost = estimate_cost_from_response(resp)
    text = (getattr(resp, "output_text", "") or "").strip()
    if not text:
        return ({"corrected_domain": None, "people": [], "error": "empty_response"}, cost, "empty_response")
    m = _re.search(r"\{.*\}", text, flags=_re.DOTALL)
    if not m:
        return ({"corrected_domain": None, "people": [], "error": f"no_json: {text[:120]}"}, cost, "no_json")
    try:
        data = _json.loads(m.group(0))
    except _json.JSONDecodeError as e:
        return ({"corrected_domain": None, "people": [], "error": f"bad_json: {e}"}, cost, "bad_json")
    people = []
    for p in (data.get("people") or [])[:7]:
        name = (p.get("name") or "").strip()
        if not name:
            continue
        people.append({
            "name": name,
            "role": (p.get("role") or "").strip(),
            "leverage_rationale": (p.get("leverage_rationale") or "")[:300],
            "email_if_known": fe._clean_email(p.get("email_if_known")),
            "source_url_if_known": p.get("source_url_if_known") or None,
            "confidence": float(p.get("confidence") or 0.0),
        })
    return ({"corrected_domain": fe._clean_domain(data.get("corrected_domain")),
             "people": people, "error": None}, cost, None)


def _process_one(client, row: dict, rate: RateLimiter, deep: bool) -> dict:
    """Single-pass processing — wrapped by process_company to support fallback."""
    company = (row.get("company_name") or "").strip()
    domain = fe.root_domain(row.get("domain") or "")
    category = (row.get("category") or "").strip()
    notes = (row.get("notes") or "").strip()

    if not domain:
        return {"company": company, "domain": "", "status": "no_domain",
                "rows": [], "cost": 0.0}

    # NOTE: dropped the dns_resolves() pre-check. Under 12-thread concurrency
    # dnspython was returning false-negatives for hundreds of valid domains.
    # smtp_probe already handles missing MX gracefully (returns "unreachable"),
    # so we don't need a pre-check — at worst we waste one OpenAI call on a
    # truly-dead domain (~5% of input). Better than dropping good ones.

    # Pseudo-row in the original schema
    pseudo = {
        "Company": company,
        "Category": category,
        "What They Do": notes,
        "Approx Size": "",
        "Website": domain,
        "Person to Contact (LinkedIn)": "",
        "Role": "",
    }
    discovery, cost, disc_err = discover_with_cost(client, pseudo, deep=deep)
    if disc_err:
        return {"company": company, "domain": domain, "status": "discovery_fail",
                "rows": [], "cost": cost, "error": disc_err}

    # Apply corrected_domain if LLM proposed one different
    eff_domain = domain
    corrected = discovery.get("corrected_domain")
    if corrected and fe.root_domain(corrected) != domain:
        eff_domain = fe.root_domain(corrected)

    people = discovery.get("people") or []
    if not people:
        return {"company": company, "domain": eff_domain, "status": "no_people",
                "rows": [], "cost": cost}

    # Per-process do-not-try set so we don't re-probe within a company
    session_dnt: set[str] = set()
    wins: list[dict] = []
    for person in people:
        if len(wins) >= 3:
            break
        queue_ = (build_deep_queue(person, eff_domain, session_dnt, cap=12)
                  if deep else
                  fl.build_candidate_queue(person, eff_domain, session_dnt))
        for cand, cite in queue_:
            session_dnt.add(cand)
            rate.acquire()
            status, src = fl.verify_candidate(eff_domain, cand, cite)
            if status == "smtp":
                conf = "verified-smtp"
            elif status == "web":
                conf = "verified-web"
            else:
                continue
            wins.append({
                "name": person["name"],
                "email": cand,
                "company": company,
                "domain": eff_domain,
                "role": person["role"],
                "category": category,
                "confidence": conf,
                "source_url": src,
                "leverage_rationale": person["leverage_rationale"],
            })
            break  # one win per person; move to next person

    status = ("3-fill" if len(wins) == 3 else f"{len(wins)}-fill") if wins else "empty"
    return {"company": company, "domain": eff_domain, "status": status,
            "rows": wins, "cost": cost}


def process_company(client, row: dict, rate: RateLimiter,
                    deep: bool = False, deep_fallback: bool = False) -> dict:
    """Top-level per-company entry point. Strategy:
      - if deep=True: single deep pass.
      - elif deep_fallback=True: default pass first; if 0 wins, deep retry.
      - else: single default pass.
    """
    if deep:
        return _process_one(client, row, rate, deep=True)

    first = _process_one(client, row, rate, deep=False)
    # Skip fallback for non-recoverable failures (DNS / no domain).
    if first["rows"]:
        return first
    if not deep_fallback:
        return first
    if first["status"] in ("dns_fail", "no_domain"):
        return first

    # Fallback: retry with deep mode. Cost accumulates.
    second = _process_one(client, row, rate, deep=True)
    second["cost"] = first["cost"] + second["cost"]
    second["fallback_used"] = True
    if second["rows"]:
        second["status"] = second["status"] + "-deep"  # tag for visibility
    else:
        second["status"] = "empty-deep"
    return second


# --- output -------------------------------------------------------------

OUT_FIELDS = [
    "name", "email", "company", "domain", "role", "category",
    "confidence", "source_url", "leverage_rationale",
]


def write_csv(out_path: Path, rows: list[dict], dry_run: bool) -> None:
    if dry_run:
        return
    tmp = out_path.with_suffix(out_path.suffix + ".tmp")
    with tmp.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=OUT_FIELDS)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in OUT_FIELDS})
    tmp.replace(out_path)


def write_progress(prog_path: Path, progress: dict, dry_run: bool) -> None:
    if dry_run:
        return
    tmp = prog_path.with_suffix(prog_path.suffix + ".tmp")
    tmp.write_text(json.dumps(progress, indent=2, sort_keys=True))
    tmp.replace(prog_path)


# --- main ---------------------------------------------------------------


def main() -> None:
    args = parse_args()

    if not os.environ.get("OPENAI_API_KEY"):
        print("ERROR: OPENAI_API_KEY not set. Add to ../.env.local or shell env.",
              file=sys.stderr)
        sys.exit(1)
    try:
        import openai
    except ImportError:
        print("ERROR: openai not installed. .venv/bin/pip install openai",
              file=sys.stderr)
        sys.exit(1)

    if not args.targets.exists():
        print(f"ERROR: targets file not found: {args.targets}", file=sys.stderr)
        sys.exit(1)

    # Verify port 25 reachable (Dartmouth VPN connected) — fail fast.
    fl.assert_verifier_available()

    LOG_DIR.mkdir(exist_ok=True)
    log_path = LOG_DIR / "find-emails-bulk.log"
    log_f = log_path.open("a")

    def log(line: str) -> None:
        log_f.write(line + "\n")
        log_f.flush()
        if args.verbose:
            print(line, flush=True)

    with args.targets.open() as f:
        all_rows = list(csv.DictReader(f))
    targets = all_rows[: args.limit] if args.limit else all_rows

    # Resume state
    rows_out: list[dict] = []
    progress: dict = {}
    cost_total = 0.0
    if args.resume:
        if args.progress.exists():
            try:
                progress = json.loads(args.progress.read_text())
                cost_total = sum(p.get("cost", 0.0) for p in progress.values())
            except json.JSONDecodeError:
                progress = {}
        if args.out.exists():
            with args.out.open() as f:
                rows_out = list(csv.DictReader(f))

    # Filter targets to undone. With --retry-empty, also drop completed-but-
    # zero-result entries from progress so they get retried.
    if args.retry_empty:
        # Include "dns_fail" — the old dns_resolves() pre-check was unreliable
        # under concurrent load, so many dns_fail entries are false-negatives.
        empty_statuses = {"empty", "empty-deep", "0-fill", "no_people",
                          "discovery_fail", "worker_exc", "no_domain",
                          "dns_fail"}
        retried_keys = [k for k, v in list(progress.items())
                        if v.get("status") in empty_statuses]
        for k in retried_keys:
            del progress[k]
        # Also subtract from running cost so the [progress] cost reflects new spend
        # only on the retried side (we keep historical OK costs intact in cost_total).
        log_msg = f"--retry-empty: dropped {len(retried_keys)} prior empty entries"
        log(log_msg)
        print(log_msg, flush=True)
    if args.resume or args.retry_empty:
        targets = [t for t in targets if fe.root_domain(t.get("domain") or "") not in progress]

    rate = RateLimiter(args.max_rate)
    client = openai.OpenAI()

    started = time.time()
    counts = {"3-fill": 0, "2-fill": 0, "1-fill": 0, "0-fill": 0,
              "empty": 0, "dns_fail": 0, "discovery_fail": 0,
              "no_people": 0, "no_domain": 0}
    # Recompute initial counts from progress
    for p in progress.values():
        s = p.get("status") or "empty"
        if s in counts:
            counts[s] += 1
        elif s == "empty":
            counts["empty"] += 1

    errors_window: list[str] = []
    total_completed = len(progress)
    total_target = total_completed + len(targets)

    banner = (
        f"model={OPENAI_MODEL} workers={args.workers} max-rate={args.max_rate}/s "
        f"deep={args.deep} retry-empty={args.retry_empty} "
        f"targets={len(targets)} (total {total_target}, already-done={len(progress)}) "
        f"out={args.out.name} resume={args.resume}"
    )
    print(banner, flush=True)
    log(banner)

    write_lock = threading.Lock()
    last_milestone = total_completed
    last_milestone_time = time.time()
    fallback_used_count = 0
    fallback_rescued_count = 0

    def maybe_milestone(force: bool = False) -> None:
        nonlocal last_milestone, last_milestone_time
        company_due = (total_completed - last_milestone) >= PROGRESS_EVERY_COMPANIES
        time_due = (time.time() - last_milestone_time) >= PROGRESS_EVERY_SECONDS
        if not force and not company_due and not time_due:
            return
        last_milestone = total_completed
        last_milestone_time = time.time()
        elapsed = int(time.time() - started)
        m, s = divmod(elapsed, 60)
        emails = len(rows_out)
        pct = 100.0 * total_completed / max(total_target, 1)
        win_buckets = (
            f"3-fill={counts['3-fill']} 2-fill={counts['2-fill']} "
            f"1-fill={counts['1-fill']} 0-fill={counts['0-fill']+counts['empty']+counts['no_people']} "
            f"dns-fail={counts['dns_fail']}"
        )
        err_tag = ""
        if errors_window:
            err_tag = f" errors-this-window={len(errors_window)}"
        ncalls = sum(1 for p in progress.values()
                     if p.get("status") not in ("dns_fail", "no_domain"))
        fb_tag = ""
        if fallback_used_count:
            fb_tag = (f" deep-fallback-used={fallback_used_count} "
                      f"rescued={fallback_rescued_count}")
        print(
            f"[progress] {total_completed}/{total_target} companies "
            f"({pct:.1f}%) — {emails} verified emails ({win_buckets}) "
            f"cost ≈ ${cost_total:.2f} ({ncalls} OpenAI calls){fb_tag}{err_tag} "
            f"elapsed={m}m{s:02d}s",
            flush=True,
        )
        errors_window.clear()

    def submit_and_collect():
        nonlocal cost_total, total_completed, fallback_used_count, fallback_rescued_count
        with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as ex:
            futures = {
                ex.submit(process_company, client, t, rate,
                          args.deep, args.deep_fallback): t
                for t in targets
            }
            for fut in concurrent.futures.as_completed(futures):
                t = futures[fut]
                try:
                    result = fut.result()
                except Exception as e:
                    msg = f"WORKER ERROR: {type(e).__name__}: {e} (domain={t.get('domain')})"
                    print(msg, flush=True)
                    log(msg)
                    errors_window.append(msg)
                    progress[fe.root_domain(t.get("domain") or "") or t.get("domain", "")] = {
                        "status": "worker_exc", "cost": 0.0, "error": str(e)[:200]
                    }
                    total_completed += 1
                    with write_lock:
                        write_progress(args.progress, progress, args.dry_run)
                    maybe_milestone()
                    continue
                key = result["domain"] or result["company"].lower()
                pe = {"status": result["status"], "cost": result["cost"]}
                if result.get("error"):
                    pe["error"] = result["error"]
                    errors_window.append(f"{result['company']}: {result['error']}")
                with write_lock:
                    progress[key] = pe
                    rows_out.extend(result["rows"])
                    cost_total += result["cost"]
                    if result.get("fallback_used"):
                        fallback_used_count += 1
                        if result["rows"]:
                            fallback_rescued_count += 1
                    bucket = result["status"]
                    # Strip "-deep" suffix for bucket counting
                    base_bucket = bucket.replace("-deep", "")
                    if base_bucket == "empty-deep":
                        base_bucket = "empty"
                    if base_bucket in counts:
                        counts[base_bucket] += 1
                    elif base_bucket == "empty":
                        counts["empty"] += 1
                    write_csv(args.out, rows_out, args.dry_run)
                    write_progress(args.progress, progress, args.dry_run)
                    total_completed += 1
                    log(
                        f"[done] {result['company'][:30]:<30} domain={result['domain']:<28} "
                        f"status={result['status']:<14} +{len(result['rows'])} emails  "
                        f"cost=${result['cost']:.3f}"
                    )
                    maybe_milestone()

    try:
        submit_and_collect()
    except KeyboardInterrupt:
        print("\nKeyboardInterrupt — finishing in-flight workers and saving snapshot",
              flush=True)

    maybe_milestone(force=True)
    elapsed = int(time.time() - started)
    m, s = divmod(elapsed, 60)
    print(
        f"\n=== Phase 2 complete ===\n"
        f"emails={len(rows_out)} companies-done={total_completed} "
        f"buckets: 3={counts['3-fill']} 2={counts['2-fill']} 1={counts['1-fill']} "
        f"0={counts['0-fill']+counts['empty']+counts['no_people']} "
        f"dns-fail={counts['dns_fail']} discovery-fail={counts['discovery_fail']}\n"
        f"cost ≈ ${cost_total:.2f}  elapsed={m}m{s:02d}s\n"
        f"out={args.out}\nprogress={args.progress}\nlog={log_path}",
        flush=True,
    )
    log_f.close()


if __name__ == "__main__":
    main()
