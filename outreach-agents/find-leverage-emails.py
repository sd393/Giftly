#!/usr/bin/env python3
"""Find up to 3 high-leverage verified emails per retail company.

Pipeline per company:
  1. One OpenAI Responses API call (with web_search_preview tool): discover
     up to 7 high-leverage contacts (decision-makers + technical implementers
     for shopping-agent integration).
  2. For each person in priority order, build a candidate email queue
     (any verbatim email Claude found + 8 generated patterns at the resolved
     domain), verify each via NeverBounce (or SMTP fallback), accept only
     `valid` (catch-all only with primary-source citation).
  3. Stop after 3 verified hits per company.

Outputs:
  - Deliverable: 4-col CSV (company, email1, email2, email3). Blank when
    fewer than 3 verify. No pattern-only fallbacks (we learned that lesson).
  - Sidecar: 9-col details CSV (one row per email) with name/role/source/
    rationale so the user can personalize when sending.

Reads OPENAI_API_KEY and NEVERBOUNCE_API_KEY from shell env or from
../.env.local (auto-loaded). NeverBounce works on any network — no port-25
or hotspot needed.

Usage:
    .venv/bin/python3 find-leverage-emails.py \\
        [--targets ~/Downloads/retail_targets_100.csv] \\
        [--out ~/Downloads/retail_emails_3x.csv] \\
        [--details ~/Downloads/retail_emails_3x_details.csv] \\
        [--limit N] [--resume] [--dry-run] [--use-smtp] [-v]

Flags:
    --use-smtp     Use direct SMTP RCPT-TO probe instead of NeverBounce.
                   Requires hotspot / non-residential network for port 25.
"""
import csv
import importlib.util
import json
import os
import random
import re
import socket
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).parent
LOG_DIR = ROOT / "logs"
PROGRESS_EVERY = 10  # print [progress] line every N verified emails
INTER_CALL_SLEEP = (0.5, 1.5)

DEFAULT_TARGETS = Path.home() / "Downloads" / "retail_targets_100.csv"
DEFAULT_OUT = Path.home() / "Downloads" / "retail_emails_3x.csv"
DEFAULT_DETAILS = Path.home() / "Downloads" / "retail_emails_3x_details.csv"

# --- env loader (.env.local fallback) ------------------------------------


def _load_env_local() -> None:
    """Load API keys from ../.env.local or ./.env if not already in env."""
    candidates = [ROOT.parent / ".env.local", ROOT / ".env"]
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

OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4.1")


# --- CLI ------------------------------------------------------------------

VERBOSE = "--verbose" in sys.argv or "-v" in sys.argv
DRY_RUN = "--dry-run" in sys.argv
USE_SMTP = "--use-smtp" in sys.argv
RESUME = "--resume" in sys.argv
RETRY_EMPTY = "--retry-empty" in sys.argv  # implies --resume; retries 0-fills


def _parse_args() -> dict:
    out = {
        "targets": DEFAULT_TARGETS,
        "out": DEFAULT_OUT,
        "details": DEFAULT_DETAILS,
        "limit": None,
    }
    i = 1
    while i < len(sys.argv):
        a = sys.argv[i]
        if a in ("--targets", "--out", "--details") and i + 1 < len(sys.argv):
            out[a[2:]] = Path(sys.argv[i + 1]).expanduser()
            i += 2
            continue
        if a == "--limit" and i + 1 < len(sys.argv):
            try:
                out["limit"] = int(sys.argv[i + 1])
            except ValueError:
                pass
            i += 2
            continue
        i += 1
    return out


ARGS = _parse_args()


# --- import helpers from find-emails.py ----------------------------------


def _load_find_emails():
    saved = sys.argv[:]
    sys.argv = [sys.argv[0]]
    try:
        spec = importlib.util.spec_from_file_location(
            "find_emails", str(ROOT / "find-emails.py")
        )
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod
    finally:
        sys.argv = saved


fe = _load_find_emails()


# --- aggregator detection (catch-all override gate) ----------------------

AGGREGATOR_HOSTS = {
    "contactout.com", "rocketreach.co", "rocketreach.com",
    "zoominfo.com", "apollo.io", "lusha.com", "success.ai",
    "snov.io", "leadiq.com", "salesintel.com", "dropcontact.com",
    "getprospect.com", "kendo.tools", "signalhire.com", "swordfish.ai",
    "leadlist.com", "voilanorbert.com", "hunter.io", "skrapp.io",
    "anymailfinder.com", "nymeria.io", "uplead.com",
}


def is_primary_source(url: str | None) -> bool:
    if not url or not url.startswith(("http://", "https://")):
        return False
    parts = url.split("/", 3)
    if len(parts) < 3:
        return False
    host = parts[2].lower()
    host = host[4:] if host.startswith("www.") else host
    return not any(host == h or host.endswith("." + h) for h in AGGREGATOR_HOSTS)


# --- email verifier (NeverBounce primary, SMTP fallback) ----------------

NB_RESULT_MAP = {
    "valid": "accepted",
    "invalid": "rejected",
    "catchall": "catchall",
    "disposable": "rejected",
    "unknown": "unreachable",
}


def neverbounce_check(email: str, *, timeout: float = 15.0) -> str:
    """Returns 'accepted' | 'rejected' | 'catchall' | 'unreachable'.

    Hits the v4 single-check endpoint. Free tier: 1000/day; paid: ~$0.005 each.

    Aborts the whole script (sys.exit 3) on credit-exhaustion or auth failure
    — silent degradation here is what wrote 37 zero-filled rows last time.
    """
    api_key = os.environ.get("NEVERBOUNCE_API_KEY")
    if not api_key:
        return "unreachable"
    qs = urllib.parse.urlencode({
        "key": api_key, "email": email,
        "address_info": 0, "credits_info": 0,
    })
    url = f"https://api.neverbounce.com/v4/single/check?{qs}"
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception:
        return "unreachable"

    status = data.get("status", "")
    if status == "success":
        return NB_RESULT_MAP.get(data.get("result", ""), "unreachable")

    # Hard-fail conditions: credit exhaustion, auth, or repeated unrecognized
    # statuses are not "transient" — they affect every subsequent call. Abort
    # so we don't write a flood of unverified rows.
    msg = (data.get("message") or "")[:160]
    if status in ("auth_failure", "general_failure") and (
        "credit" in msg.lower() or "balance" in msg.lower()
        or "auth" in msg.lower() or "api key" in msg.lower()
    ):
        print(
            f"\nERROR: NeverBounce {status}: {msg}\n"
            "       Top up credits or switch to --use-smtp (requires hotspot "
            "or VPN with port 25 open). Aborting to avoid writing unverified "
            "rows.",
            file=sys.stderr,
        )
        sys.exit(3)
    return "unreachable"


def probe_email(domain: str, candidate: str) -> str:
    """Returns 'accepted' | 'rejected' | 'catchall' | 'unreachable'.

    NeverBounce by default; --use-smtp falls back to direct RCPT-TO probe
    (requires port 25 open).
    """
    if USE_SMTP:
        return fe.smtp_probe(domain, candidate)
    return neverbounce_check(candidate)


def assert_verifier_available() -> None:
    if USE_SMTP:
        try:
            s = socket.create_connection(("gmail-smtp-in.l.google.com", 25), timeout=8)
            s.close()
        except Exception as e:
            print(
                "ERROR: --use-smtp requested but port 25 is blocked. "
                "Tether to hotspot or drop the flag to use NeverBounce.\n"
                f"       (probe error: {type(e).__name__}: {e})",
                file=sys.stderr,
            )
            sys.exit(2)
        return
    if not os.environ.get("NEVERBOUNCE_API_KEY"):
        print(
            "ERROR: NEVERBOUNCE_API_KEY not set.\n"
            "       Add to ../.env.local or shell env, or pass --use-smtp "
            "(requires hotspot).",
            file=sys.stderr,
        )
        sys.exit(2)


# --- Anthropic discovery prompt ------------------------------------------

DISCOVERY_SYSTEM_PROMPT = """You are a research assistant identifying high-leverage contacts at a retail company for a cold-outreach email about integrating AI shopping agents on their online storefront.

GOAL
Return up to 7 people at the company who would (a) be likely to RESPOND to a cold email and (b) be the right person to evaluate or implement a shopping-agent integration on their digital storefront.

PRIORITIZE (in this order)
1. Decision authority for digital storefront tech: founders, CEOs at small/mid-size companies; VP/Head of E-commerce; VP/Director of Digital; VP/Director of D2C; Head of Online; Chief Digital Officer.
2. Technical implementer who would touch the integration: CTO, VP Engineering, Head of Platform, Head of Product (digital — not merchandising/buying), Head of Innovation/AI/Emerging Tech.
3. Conversion / discovery operators: Head of Growth, Head of Personalization, Head of Site Experience, Head of Customer Experience.
4. Likely-responsive backups (only at small companies): Chief of Staff, Founder's Office, Head of Partnerships, EA-to-CEO.

DE-RANK / EXCLUDE
- Marketing managers, brand managers, social/PR/community/content roles.
- Retail store managers, regional managers, anything physical-retail-only.
- HR, recruiting, finance, legal, IR, supply chain.
- Generic catch-all addresses (hello@, info@, press@, support@). Those are not people — never return them.

EMAIL RULES
- Only return an `email_if_known` if you saw it verbatim on a primary source: company website, GitHub commit/profile, conference page, podcast show notes, news article, press release, the person's personal site, an academic paper.
- Aggregator/data-broker sightings (RocketReach, ContactOut, ZoomInfo, Apollo, Lusha, Hunter.io, etc.) are NOT primary sources for `email_if_known` — set it to null even if you saw a masked or partial version. You may mention the sighting in `leverage_rationale`.
- If you don't know the email, return `email_if_known: null`. Patterns will be guessed and SMTP-verified downstream.

DOMAIN VERIFICATION
- Verify the input website domain actually matches the company's email domain. If they differ (e.g., `huckberry.com` for the storefront vs `huckberryinc.com` for staff email), set `corrected_domain` to the real email domain. Otherwise null.

OUTPUT
Output exactly ONE JSON object as your final message — no prose around it, no markdown fences. Schema:
{
  "corrected_domain": <string or null>,
  "people": [
    {
      "name": <string, full name>,
      "role": <string, current title at this company>,
      "leverage_rationale": <string, one sentence on why they're high-leverage for this pitch>,
      "email_if_known": <string or null>,
      "source_url_if_known": <string or null>,
      "confidence": <float 0.0-1.0 — how confident the email_if_known is correct, 0 if null>
    },
    ...
  ]
}

Cap the people list at 7. If fewer high-leverage people exist or are findable, return fewer. Order the list highest-leverage first.
"""


def discover_user_prompt(row: dict) -> str:
    return (
        f"Company: {row.get('Company', '')}\n"
        f"Category: {row.get('Category', '')}\n"
        f"What they do: {row.get('What They Do', '')}\n"
        f"Approx size: {row.get('Approx Size', '')}\n"
        f"Website: {row.get('Website', '')}\n"
        f"Hint (one already-suggested contact, may or may not be optimal): "
        f"{row.get('Person to Contact (LinkedIn)', '')} "
        f"({row.get('Role', '')})\n\n"
        f"Identify up to 7 high-leverage contacts per the system prompt and "
        f"output the JSON object."
    )


def discover_people(client, row: dict) -> dict:
    """Returns {corrected_domain, people: [...], error}.

    Uses OpenAI Responses API with web_search_preview tool. The system
    prompt is sent via `instructions` (auto-cached server-side); the
    per-row prompt via `input`.
    """
    try:
        resp = client.responses.create(
            model=OPENAI_MODEL,
            instructions=DISCOVERY_SYSTEM_PROMPT,
            input=discover_user_prompt(row),
            tools=[{"type": "web_search_preview"}],
        )
    except Exception as e:
        return {"corrected_domain": None, "people": [],
                "error": f"api_error: {type(e).__name__}: {e}"}

    text = (getattr(resp, "output_text", "") or "").strip()
    if not text:
        return {"corrected_domain": None, "people": [], "error": "empty_response"}

    m = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if not m:
        return {"corrected_domain": None, "people": [],
                "error": f"no_json: {text[:120]}"}
    try:
        data = json.loads(m.group(0))
    except json.JSONDecodeError as e:
        return {"corrected_domain": None, "people": [],
                "error": f"bad_json: {e}"}

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
    return {
        "corrected_domain": fe._clean_domain(data.get("corrected_domain")),
        "people": people,
        "error": None,
    }


# --- per-person verification ---------------------------------------------


def build_candidate_queue(person: dict, domain: str, session_dnt: set[str]) -> list[tuple[str, str | None]]:
    """[(email, citation_url_or_None), ...] in priority order, capped at 6."""
    queue: list[tuple[str, str | None]] = []
    seen = set(session_dnt)

    em = person.get("email_if_known")
    if em and em not in seen:
        if fe.root_domain(em.split("@", 1)[-1]) == domain:
            queue.append((em, person.get("source_url_if_known")))
            seen.add(em)

    for p in fe.generate_patterns(person.get("name", ""), domain):
        if p in seen:
            continue
        queue.append((p, None))
        seen.add(p)

    return queue[:6]


def verify_candidate(domain: str, candidate: str, citation_url: str | None) -> tuple[str, str]:
    """Returns (status, source) where status in {'smtp', 'web', 'none'}."""
    res = probe_email(domain, candidate)
    if res == "accepted":
        return "smtp", citation_url or "https://verified-smtp/"
    if res == "catchall":
        if citation_url and is_primary_source(citation_url):
            return "web", citation_url
    return "none", ""


# --- output --------------------------------------------------------------

DELIV_FIELDS = ["company", "email1", "email2", "email3"]
DETAIL_FIELDS = [
    "company", "domain", "slot", "name", "role",
    "email", "confidence", "source_url", "leverage_rationale",
]


def write_outputs(out_path: Path, details_path: Path,
                  deliv_rows: list[dict], detail_rows: list[dict]) -> None:
    if DRY_RUN:
        return
    for path, fields, rows in (
        (out_path, DELIV_FIELDS, deliv_rows),
        (details_path, DETAIL_FIELDS, detail_rows),
    ):
        tmp = path.with_suffix(path.suffix + ".tmp")
        with tmp.open("w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=fields)
            w.writeheader()
            for r in rows:
                w.writerow({k: r.get(k, "") for k in fields})
        tmp.replace(path)


# --- main ----------------------------------------------------------------


def main() -> None:
    if not os.environ.get("OPENAI_API_KEY"):
        print(
            "ERROR: OPENAI_API_KEY not set. Add to ../.env.local or shell env.",
            file=sys.stderr,
        )
        sys.exit(1)

    assert_verifier_available()

    try:
        import openai
    except ImportError:
        print(
            "ERROR: `openai` not installed. Run: "
            ".venv/bin/pip install openai",
            file=sys.stderr,
        )
        sys.exit(1)

    targets_path: Path = ARGS["targets"]
    out_path: Path = ARGS["out"]
    details_path: Path = ARGS["details"]
    limit = ARGS["limit"]

    if not targets_path.exists():
        print(f"ERROR: targets file not found: {targets_path}", file=sys.stderr)
        sys.exit(1)

    with targets_path.open() as f:
        all_rows = list(csv.DictReader(f))
    targets = all_rows[:limit] if limit else all_rows

    LOG_DIR.mkdir(exist_ok=True)
    log_path = LOG_DIR / f"find-leverage-{targets_path.stem}.log"
    log_f = log_path.open("w")
    started = time.time()

    def log(line: str) -> None:
        log_f.write(line + "\n")
        log_f.flush()
        if VERBOSE:
            print(line, flush=True)

    deliv_rows: list[dict] = []
    detail_rows: list[dict] = []
    done_companies: set[str] = set()
    # When retrying empties, an existing 0-filled row gets *replaced* in place
    # instead of appended. This index maps lowercase-company -> position.
    deliv_index_by_company: dict[str, int] = {}
    if (RESUME or RETRY_EMPTY) and out_path.exists():
        with out_path.open() as f:
            for r in csv.DictReader(f):
                deliv_rows.append(r)
                key = (r.get("company") or "").strip().lower()
                if not key:
                    continue
                deliv_index_by_company[key] = len(deliv_rows) - 1
                has_any_email = any(r.get(f"email{i}") for i in (1, 2, 3))
                # In retry-empty mode we DON'T mark zero-filled companies done.
                if RETRY_EMPTY and not has_any_email:
                    continue
                done_companies.add(key)
        if details_path.exists():
            with details_path.open() as f:
                detail_rows = list(csv.DictReader(f))

    counts = {"3-filled": 0, "2-filled": 0, "1-filled": 0,
              "0-filled": 0, "skipped-resume": 0, "discovery-error": 0}
    session_dnt: set[str] = set()
    total_wins = 0
    last_progress_threshold = 0
    companies_with_wins = 0

    client = openai.OpenAI()
    resume_tag = (
        f" resume={len(done_companies)}-skipped"
        if (RESUME or RETRY_EMPTY) else ""
    )
    verifier = "smtp" if USE_SMTP else "neverbounce"
    banner = (
        f"model={OPENAI_MODEL} verifier={verifier} companies={len(targets)} "
        f"dry_run={DRY_RUN} out={out_path.name}{resume_tag}"
    )
    log(banner)
    print(banner, flush=True)
    print(
        f"[progress] outputs at {out_path} "
        f"(snapshot after every company, milestones every {PROGRESS_EVERY} verified emails)",
        flush=True,
    )

    for i, raw_row in enumerate(targets, 1):
        company = (raw_row.get("Company") or "").strip()
        if not company:
            continue
        if (RESUME or RETRY_EMPTY) and company.lower() in done_companies:
            counts["skipped-resume"] += 1
            log(f"[{i:>3}/{len(targets)}] {company:<26} SKIP (already done)")
            continue

        website = (raw_row.get("Website") or "").strip()
        domain_seed = fe.root_domain(website)
        if not domain_seed:
            log(f"[{i:>3}/{len(targets)}] {company:<26} no domain in row, skipping")
            counts["0-filled"] += 1
            deliv_rows.append({"company": company, "email1": "", "email2": "", "email3": ""})
            write_outputs(out_path, details_path, deliv_rows, detail_rows)
            continue

        log(f"[{i:>3}/{len(targets)}] {company:<26} domain={domain_seed}")

        discovery = discover_people(client, raw_row)
        if discovery.get("error"):
            log(f"   discovery error: {discovery['error']}")
            counts["discovery-error"] += 1

        domain = domain_seed
        corrected = discovery.get("corrected_domain")
        if corrected and fe.root_domain(corrected) != domain_seed:
            domain = fe.root_domain(corrected)
            log(f"   domain corrected: {domain_seed} -> {domain}")

        people = discovery.get("people") or []
        log(f"   discovered {len(people)} people")

        wins: list[dict] = []
        for person in people:
            if len(wins) >= 3:
                break
            queue = build_candidate_queue(person, domain, session_dnt)
            log(
                f"   try {person['name'][:24]:<24} "
                f"role={person['role'][:34]:<34} "
                f"candidates={len(queue)}"
            )
            for cand, cite in queue:
                status, src = verify_candidate(domain, cand, cite)
                session_dnt.add(cand)
                if status == "smtp":
                    confidence = "verified-smtp"
                elif status == "web":
                    confidence = "verified-web"
                else:
                    log(f"      try {cand:<40} -> rejected/catchall/unreachable")
                    continue
                slot = len(wins) + 1
                log(f"      WIN slot={slot} {cand:<40} via={status}")
                wins.append({
                    "slot": slot,
                    "name": person["name"],
                    "role": person["role"],
                    "email": cand,
                    "confidence": confidence,
                    "source_url": src,
                    "rationale": person["leverage_rationale"],
                })
                break

        deliv = {"company": company, "email1": "", "email2": "", "email3": ""}
        for w in wins:
            deliv[f"email{w['slot']}"] = w["email"]
        existing_idx = deliv_index_by_company.get(company.lower())
        if existing_idx is not None:
            deliv_rows[existing_idx] = deliv
            # also drop any prior detail rows for this company (we'll re-add)
            detail_rows[:] = [d for d in detail_rows
                              if (d.get("company") or "").lower() != company.lower()]
        else:
            deliv_index_by_company[company.lower()] = len(deliv_rows)
            deliv_rows.append(deliv)

        for w in wins:
            detail_rows.append({
                "company": company,
                "domain": domain,
                "slot": w["slot"],
                "name": w["name"],
                "role": w["role"],
                "email": w["email"],
                "confidence": w["confidence"],
                "source_url": w["source_url"],
                "leverage_rationale": w["rationale"],
            })

        n = len(wins)
        counts[f"{n}-filled"] += 1
        log(f"   -> {n} verified")

        write_outputs(out_path, details_path, deliv_rows, detail_rows)

        total_wins += n
        if n > 0:
            companies_with_wins += 1
        # Print a [progress] milestone every PROGRESS_EVERY verified emails.
        # Crosses the threshold once even if a single company adds 3 wins.
        while total_wins >= last_progress_threshold + PROGRESS_EVERY:
            last_progress_threshold += PROGRESS_EVERY
            print(
                f"[progress] {last_progress_threshold} verified emails across "
                f"{companies_with_wins} companies — processed {i}/{len(targets)} "
                f"(last: {company} {n}/3)",
                flush=True,
            )

        if i < len(targets):
            time.sleep(random.uniform(*INTER_CALL_SLEEP))

    log_f.close()
    elapsed = int(time.time() - started)
    summary = " ".join(f"{k}={v}" for k, v in counts.items() if v)
    dry_tag = " (DRY RUN)" if DRY_RUN else ""
    out_tag = "" if DRY_RUN else f" out={out_path.name} details={details_path.name}"
    print(
        f"{summary} elapsed={elapsed}s "
        f"log={log_path.relative_to(ROOT)}{out_tag}{dry_tag}"
    )


if __name__ == "__main__":
    main()
