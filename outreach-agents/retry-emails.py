#!/usr/bin/env python3
"""Retry the bounced contacts with verified-deliverable emails only.

Reads bounced-emails.csv, looks up each bounced row in batch-enriched.csv,
walks the P1->P5 contact stack from contacts.csv (same company), web-searches
Anthropic for fresh candidates, SMTP-verifies each before writing. Only
verified rows make it into the output CSV.

Aborts at startup if port 25 outbound is blocked — silent degradation is
what got us 45 bounces last time.

Usage:
    ANTHROPIC_API_KEY=... .venv/bin/python3 retry-emails.py \\
        --bounced ~/Downloads/bounced-emails.csv \\
        [--enriched batch-enriched.csv] [--contacts contacts.csv] \\
        [--out batch-retry-<DATE>.csv] [--limit N] [--dry-run] [-v]
"""
import csv
import importlib.util
import json
import os
import random
import socket
import sys
import time
from datetime import date
from pathlib import Path

ROOT = Path(__file__).parent
LOG_DIR = ROOT / "logs"

# --- CLI ------------------------------------------------------------------

VERBOSE = "--verbose" in sys.argv or "-v" in sys.argv
DRY_RUN = "--dry-run" in sys.argv
SKIP_PORT_CHECK = "--skip-port-check" in sys.argv
RESUME = "--resume" in sys.argv

DEFAULTS = {
    "bounced": Path.home() / "Downloads" / "bounced-emails.csv",
    "enriched": ROOT / "batch-enriched.csv",
    "contacts": ROOT / "contacts.csv",
    "out": None,  # resolved below
    "limit": None,
}


def _resolve_out_path(explicit: Path | None) -> Path:
    """If --out was passed, use it. If --resume and an existing
    batch-retry-*.csv exists, use the most recent one (so the date rolling
    over doesn't accidentally start a fresh file). Otherwise today's date.
    """
    if explicit is not None:
        return explicit
    if RESUME:
        existing = sorted(ROOT.glob("batch-retry-*.csv"))
        if existing:
            return existing[-1]
    return ROOT / f"batch-retry-{date.today().isoformat()}.csv"


def _parse_args() -> dict:
    out = dict(DEFAULTS)
    explicit_out: Path | None = None
    i = 1
    while i < len(sys.argv):
        a = sys.argv[i]
        if a in ("--bounced", "--enriched", "--contacts") and i + 1 < len(sys.argv):
            out[a[2:]] = Path(sys.argv[i + 1]).expanduser()
            i += 2
            continue
        if a == "--out" and i + 1 < len(sys.argv):
            explicit_out = Path(sys.argv[i + 1]).expanduser()
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
    out["out"] = _resolve_out_path(explicit_out)
    return out


ARGS = _parse_args()


# --- import helpers from find-emails.py -----------------------------------


def _load_find_emails():
    """Import find-emails.py without triggering its main()."""
    saved = sys.argv[:]
    sys.argv = [sys.argv[0]]  # neutralize CLI parsing inside find-emails.py
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


# --- aggregator detection (catch-all override gate) -----------------------

AGGREGATOR_HOSTS = {
    "contactout.com", "rocketreach.co", "rocketreach.com",
    "zoominfo.com", "apollo.io", "lusha.com", "success.ai",
    "snov.io", "leadiq.com", "salesintel.com", "dropcontact.com",
    "getprospect.com", "kendo.tools", "signalhire.com", "swordfish.ai",
    "leadlist.com", "voilanorbert.com", "hunter.io", "skrapp.io",
    "anymailfinder.com", "nymeria.io", "uplead.com",
}


def is_primary_source(url: str | None) -> bool:
    """Citation URL counts as primary if it's not a known data-broker host."""
    if not url or not url.startswith(("http://", "https://")):
        return False
    host = url.split("/", 3)[2].lower()
    host = host[4:] if host.startswith("www.") else host
    return not any(host == h or host.endswith("." + h) for h in AGGREGATOR_HOSTS)


# --- port-25 fail-fast ----------------------------------------------------


def assert_port_25() -> None:
    if SKIP_PORT_CHECK:
        return
    try:
        s = socket.create_connection(("gmail-smtp-in.l.google.com", 25), timeout=8)
        s.close()
    except Exception as e:
        print(
            "ERROR: port 25 outbound is blocked — SMTP verification cannot run.\n"
            "       Tether to a mobile hotspot and re-run.\n"
            f"       (probe error: {type(e).__name__}: {e})\n"
            "       To override anyway, pass --skip-port-check (NOT recommended).",
            file=sys.stderr,
        )
        sys.exit(2)


# --- retry-specific Anthropic prompt --------------------------------------


def retry_user_prompt(person: dict, do_not_try: set[str], context: str) -> str:
    dnt = "\n".join(f"  - {e}" for e in sorted(do_not_try)) or "  (none)"
    return (
        f"Find the work email for:\n"
        f"- Name: {person.get('name', '')}\n"
        f"- Role: {person.get('role', '')}\n"
        f"- Company: {person.get('company', '')}\n"
        f"- Domain: {person.get('domain', '')}\n"
        f"- Context: {person.get('notes', '')}\n\n"
        f"CONTEXT: {context}\n\n"
        f"Already-tried emails (CONFIRMED UNDELIVERABLE OR ALREADY GUESSED — "
        f"do NOT propose any of these or trivial variants):\n{dnt}\n\n"
        f"Search the web. Output the JSON described in the system prompt."
    )


def web_search_with_dnt(client, person: dict, do_not_try: set[str], context: str) -> dict:
    """Same as fe.web_search_email but with do-not-try list embedded."""
    try:
        resp = client.messages.create(
            model=fe.MODEL,
            max_tokens=2048,
            system=[{"type": "text", "text": fe.SYSTEM_PROMPT,
                     "cache_control": {"type": "ephemeral"}}],
            tools=[{"type": "web_search_20250305", "name": "web_search",
                    "max_uses": fe.WEB_SEARCH_MAX_USES}],
            messages=[{"role": "user",
                       "content": retry_user_prompt(person, do_not_try, context)}],
        )
    except Exception as e:
        return {"best_email": None, "source_url": None, "confidence": 0.0,
                "alt_candidates": [], "corrected_domain": None,
                "reasoning": f"api_error: {type(e).__name__}: {e}"}

    text = ""
    for block in reversed(resp.content):
        if getattr(block, "type", None) == "text":
            text = block.text
            break
    if not text:
        return {"best_email": None, "source_url": None, "confidence": 0.0,
                "alt_candidates": [], "corrected_domain": None,
                "reasoning": "empty response"}

    import re
    m = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if not m:
        return {"best_email": None, "source_url": None, "confidence": 0.0,
                "alt_candidates": [], "corrected_domain": None,
                "reasoning": f"no_json: {text[:120]}"}
    try:
        data = json.loads(m.group(0))
    except json.JSONDecodeError as e:
        return {"best_email": None, "source_url": None, "confidence": 0.0,
                "alt_candidates": [], "corrected_domain": None,
                "reasoning": f"bad_json: {e}"}

    return {
        "best_email": fe._clean_email(data.get("best_email")),
        "source_url": data.get("source_url") or None,
        "confidence": float(data.get("confidence") or 0.0),
        "alt_candidates": [fe._clean_email(e) for e in (data.get("alt_candidates") or []) if fe._clean_email(e)],
        "corrected_domain": fe._clean_domain(data.get("corrected_domain")),
        "reasoning": (data.get("reasoning") or "")[:300],
    }


# --- contact stack -------------------------------------------------------


def load_contact_stack(contacts_csv: Path, company: str, domain: str) -> list[dict]:
    """Return contacts at this company, sorted by priority ascending."""
    if not contacts_csv.exists():
        return []
    company_n = (company or "").strip().lower()
    domain_n = fe.root_domain(domain or "")
    rows: list[dict] = []
    with contacts_csv.open() as f:
        for r in csv.DictReader(f):
            r_company = (r.get("company") or "").strip().lower()
            r_domain = fe.root_domain(r.get("domain") or "")
            if r_company == company_n or (domain_n and r_domain == domain_n):
                rows.append(r)
    rows.sort(key=lambda r: int(r.get("priority") or 99))
    return rows


# --- pipeline ------------------------------------------------------------


def build_candidate_queue(person: dict, web: dict, do_not_try: set[str]) -> list[tuple[str, str | None]]:
    """Return [(candidate_email, citation_url_or_None), ...] in priority order."""
    domain = fe.root_domain(person["domain"])
    queue: list[tuple[str, str | None]] = []
    seen = set(do_not_try)

    if web["best_email"] and web["confidence"] >= 0.5:
        em = web["best_email"]
        if em not in seen and fe.root_domain(em.split("@", 1)[-1]) == domain:
            queue.append((em, web["source_url"]))
            seen.add(em)

    for em in web["alt_candidates"]:
        if em in seen:
            continue
        if fe.root_domain(em.split("@", 1)[-1]) != domain:
            continue
        queue.append((em, web["source_url"]))
        seen.add(em)

    for p in fe.generate_patterns(person.get("name", ""), domain):
        if p in seen:
            continue
        queue.append((p, None))
        seen.add(p)

    return queue[:6]  # cap per plan


def verify_candidate(domain: str, candidate: str, citation_url: str | None) -> tuple[str, str]:
    """Returns (status, source) where status in {smtp, web, none}."""
    res = fe.smtp_probe(domain, candidate)
    if res == "accepted":
        return "smtp", citation_url or "https://verified-smtp/"
    if res == "catchall":
        if citation_url and is_primary_source(citation_url):
            return "web", citation_url
        return "none", ""
    return "none", ""


def write_csv(out_path: Path, rows: list[dict], fieldnames: list[str]) -> None:
    if DRY_RUN:
        return
    tmp = out_path.with_suffix(out_path.suffix + ".tmp")
    with tmp.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in fieldnames})
    tmp.replace(out_path)


def main() -> None:
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("ERROR: ANTHROPIC_API_KEY not set", file=sys.stderr)
        sys.exit(1)

    assert_port_25()

    try:
        import anthropic
    except ImportError:
        print("ERROR: `anthropic` package not installed. Run: pip3 install -r requirements.txt", file=sys.stderr)
        sys.exit(1)

    bounced_path: Path = ARGS["bounced"]
    enriched_path: Path = ARGS["enriched"]
    contacts_path: Path = ARGS["contacts"]
    out_path: Path = ARGS["out"]
    limit = ARGS["limit"]

    if not bounced_path.exists():
        print(f"ERROR: bounced file not found: {bounced_path}", file=sys.stderr)
        sys.exit(1)
    if not enriched_path.exists():
        print(f"ERROR: enriched file not found: {enriched_path}", file=sys.stderr)
        sys.exit(1)

    with bounced_path.open() as f:
        bounced_rows = list(csv.DictReader(f))
    with enriched_path.open() as f:
        enriched_rows = list(csv.DictReader(f))

    enriched_by_email = {(r.get("email") or "").strip().lower(): r for r in enriched_rows if r.get("email")}

    targets = bounced_rows[:limit] if limit else bounced_rows

    LOG_DIR.mkdir(exist_ok=True)
    log_path = LOG_DIR / f"retry-{bounced_path.stem}.log"
    log_f = log_path.open("w")
    started = time.time()

    def log(line: str) -> None:
        log_f.write(line + "\n")
        log_f.flush()
        if VERBOSE:
            print(line, flush=True)

    out_fields = [
        "name", "role", "company", "domain", "category", "notes",
        "email", "email_source", "confidence",
        "retry_priority", "retry_notes",
    ]
    written: list[dict] = []
    already_verified_companies: set[str] = set()
    if RESUME and out_path.exists():
        with out_path.open() as f:
            for r in csv.DictReader(f):
                written.append(r)
                key = (r.get("company") or "").strip().lower()
                if key:
                    already_verified_companies.add(key)
    counts = {"verified-smtp": 0, "verified-web": 0, "unrecoverable": 0,
              "skipped-resume": 0}
    # Cross-row do-not-try set: any email we've already SMTP-tested negatively.
    session_dnt: set[str] = set()

    client = anthropic.Anthropic()
    resume_tag = f" resume={len(already_verified_companies)}-skipped" if RESUME else ""
    log(f"model={fe.MODEL} bounced_rows={len(targets)} dry_run={DRY_RUN} out={out_path.name}{resume_tag}")

    for i, brow in enumerate(targets, 1):
        bounced_email = (brow.get("bounced_email") or "").strip().lower()
        session_dnt.add(bounced_email)
        original = enriched_by_email.get(bounced_email)
        if not original:
            log(f"[{i:>2}/{len(targets)}] {bounced_email} — no match in {enriched_path.name}, skipping")
            continue

        company = (original.get("company") or "").strip()
        domain_seed = original.get("domain") or ""

        if RESUME and company.lower() in already_verified_companies:
            counts["skipped-resume"] += 1
            log(f"[{i:>2}/{len(targets)}] company={company:<22} SKIP (already verified)")
            continue

        stack = load_contact_stack(contacts_path, company, domain_seed)
        if not stack:
            stack = [original]  # at least try the original person

        log(f"[{i:>2}/{len(targets)}] company={company:<22} stack={len(stack)} bounced={bounced_email}")

        winner: dict | None = None
        attempts: list[str] = []
        for person in stack:
            person_name = (person.get("name") or "").strip()
            person_role = (person.get("role") or "").strip()
            person_priority = int(person.get("priority") or 1)
            domain = fe.root_domain(person.get("domain") or domain_seed)

            # do_not_try holds emails we've actually probed (and got
            # non-accepted) plus the bounced one. Patterns are candidates
            # to test, not exclusions — they only end up in dnt after a
            # failed SMTP probe.
            do_not_try = set(session_dnt)
            if person_priority == 1:
                do_not_try.add(bounced_email)

            ctx = (
                f"This is a retry. The earlier email `{bounced_email}` for "
                f"{(original.get('name') or '?').strip()} bounced. We are "
                f"considering contacting {person_name} ({person_role}) at "
                f"{company} (priority {person_priority})."
            )
            web = web_search_with_dnt(client, {
                "name": person_name, "role": person_role, "company": company,
                "domain": domain, "notes": person.get("notes") or original.get("notes") or "",
            }, do_not_try, ctx)

            corrected = web.get("corrected_domain")
            if corrected and fe.root_domain(corrected) != domain:
                domain = fe.root_domain(corrected)

            queue = build_candidate_queue({"name": person_name, "domain": domain}, web, do_not_try)
            log(f"   P{person_priority} {person_name:<26} candidates={len(queue)} web_conf={web['confidence']:.2f}")

            for cand, cite in queue:
                status, src = verify_candidate(domain, cand, cite)
                attempts.append(f"P{person_priority} {cand} -> {status}")
                session_dnt.add(cand)
                if status == "smtp":
                    confidence = "verified-smtp"
                elif status == "web":
                    confidence = "verified-web"
                else:
                    log(f"      try {cand:<40} status=rejected/catchall/unreachable")
                    continue
                log(f"      WIN {cand:<40} via={status} src={src[:60]}")
                winner = {
                    "name": person_name,
                    "role": person_role,
                    "company": company,
                    "domain": domain,
                    "category": person.get("category") or original.get("category") or "",
                    "notes": person.get("notes") or original.get("notes") or "",
                    "email": cand,
                    "email_source": src,
                    "confidence": confidence,
                    "retry_priority": str(person_priority),
                    "retry_notes": (
                        f"P1 ({(original.get('name') or '').strip()}) bounced; "
                        f"P{person_priority} verified via {status}"
                    ),
                }
                break

            if winner:
                break
            log(f"   P{person_priority} exhausted")

        if winner:
            written.append(winner)
            counts[winner["confidence"]] += 1
            write_csv(out_path, written, out_fields)
        else:
            counts["unrecoverable"] += 1
            log(f"   UNRECOVERABLE — full stack exhausted, {len(attempts)} attempts")
            if VERBOSE:
                for a in attempts:
                    log(f"      {a}")

        if i < len(targets):
            time.sleep(random.uniform(*fe.INTER_CALL_SLEEP))

    log_f.close()
    elapsed = int(time.time() - started)
    summary = " ".join(f"{k}={v}" for k, v in counts.items() if v)
    dry_tag = " (DRY RUN)" if DRY_RUN else ""
    print(
        f"{summary} elapsed={elapsed}s log={log_path.relative_to(ROOT)}"
        f"{'' if DRY_RUN else f' out={out_path.name}'}{dry_tag}"
    )


if __name__ == "__main__":
    main()
