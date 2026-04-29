#!/usr/bin/env python3
"""Upgrade <batch>.csv from generic role addresses to personal emails.

For each row: generate name-based pattern candidates, web-search via
Anthropic API for a sourced email, optionally SMTP RCPT-TO probe to verify
deliverability, then write the best candidate back with a `confidence`
column. Original generic email is preserved as the row's `email` when
nothing better is found, so the existing send pipeline still works.

Stdout is summary-only. Per-row detail goes to logs/find-<batch-stem>.log.

Usage:
    ANTHROPIC_API_KEY=sk-ant-... python3 find-emails.py [batch.csv] \\
        [--limit N] [--dry-run] [-v|--verbose]

Env:
    ANTHROPIC_API_KEY (required)
    ANTHROPIC_MODEL   (optional, default claude-opus-4-7)
"""
import csv
import json
import os
import random
import re
import smtplib
import socket
import sys
import time
import unicodedata
from pathlib import Path

ROOT = Path(__file__).parent
LOG_DIR = ROOT / "logs"
VERBOSE = "--verbose" in sys.argv or "-v" in sys.argv
DRY_RUN = "--dry-run" in sys.argv
LIMIT = None
OUT_PATH: Path | None = None
_positional = []
i = 1
while i < len(sys.argv):
    a = sys.argv[i]
    if a == "--limit" and i + 1 < len(sys.argv):
        try:
            LIMIT = int(sys.argv[i + 1])
        except ValueError:
            pass
        i += 2
        continue
    if a == "--out" and i + 1 < len(sys.argv):
        OUT_PATH = Path(sys.argv[i + 1])
        i += 2
        continue
    if a.startswith("--") or a in ("-v",):
        i += 1
        continue
    _positional.append(a)
    i += 1
CSV_PATH = Path(_positional[0]) if _positional else (ROOT / "batch.csv")

MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-opus-4-7")
SMTP_TIMEOUT = 10.0
WEB_SEARCH_MAX_USES = 5
INTER_CALL_SLEEP = (0.5, 1.5)
HONORIFICS = {"dr", "mr", "mrs", "ms", "prof", "sir"}
SUFFIXES = {"jr", "sr", "ii", "iii", "iv", "phd", "md"}


# --- helpers ---------------------------------------------------------------


def root_domain(d: str) -> str:
    """Same as scrape-batch.py — strip common subdomain prefixes."""
    parts = d.lower().strip().split(".")
    if len(parts) <= 2:
        return d.lower().strip()
    if parts[0] in {"www", "shop", "store", "get", "try", "my", "the", "us", "uk", "app", "docs"}:
        return ".".join(parts[1:])
    return d.lower().strip()


def normalize_token(s: str) -> str:
    """Strip accents, lowercase, keep only [a-z0-9]. Müller -> muller."""
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", s.lower())


def split_name(raw: str) -> tuple[str, str]:
    """Return (first, last) tokens, normalized. Empty strings if unparseable."""
    raw = raw.strip()
    raw = re.split(r"[(,]", raw, maxsplit=1)[0].strip()
    parts = [p for p in raw.split() if p]
    parts = [p for p in parts if normalize_token(p.rstrip(".")) not in HONORIFICS]
    parts = [p for p in parts if normalize_token(p.rstrip(".")) not in SUFFIXES]
    if not parts:
        return "", ""
    if len(parts) == 1:
        return normalize_token(parts[0]), ""
    return normalize_token(parts[0]), normalize_token(parts[-1])


def generate_patterns(name: str, domain: str) -> list[str]:
    first, last = split_name(name)
    d = root_domain(domain)
    if not first or not d:
        return []
    pats = []
    if last:
        pats.extend([
            f"{first}.{last}@{d}",
            f"{first}@{d}",
            f"{first[0]}{last}@{d}",
            f"{first}{last}@{d}",
            f"{last}@{d}",
            f"{first}_{last}@{d}",
            f"{last}.{first}@{d}",
            f"{first}{last[0]}@{d}",
        ])
    else:
        pats.append(f"{first}@{d}")
    seen = set()
    out = []
    for p in pats:
        if p not in seen:
            seen.add(p)
            out.append(p)
    return out


# --- Anthropic web search -------------------------------------------------


SYSTEM_PROMPT = """You are an email research assistant. Your job: find a specific person's work email at their current company by searching the open web.

CRITICAL RULES
1. NEVER fabricate or guess emails. Return an email ONLY if you find it explicitly mentioned verbatim in a credible source: the company's own website, a press release, GitHub commit/profile, conference attendee/speaker page, podcast show notes, news article, academic paper, or similar.
2. Masked sightings on data brokers (e.g., RocketReach showing `j****@daydream.ing`) are NOT verbatim and MUST NOT be returned as best_email — but you MAY note them in `reasoning` if they corroborate a pattern.
3. LinkedIn profiles rarely show emails directly. Twitter/X bios sometimes do. The company's /team or /about page sometimes does.
4. Do NOT trust patterns alone. "Most people at <company> use first.last@<domain>" is NOT evidence of this specific person's email. Only return a literal email you saw on the open web.
5. If the person has multiple emails (e.g., they switched companies), prefer the one matching the requested domain.

DOMAIN VERIFICATION
Before searching, verify the requested `domain` actually belongs to the requested `company`. Some inputs may be wrong (e.g., the company moved domains, a typo, a defunct domain).
- If the company's real primary domain is different from the requested one, set `corrected_domain` to the real domain (lowercase, bare — no scheme, no path). Otherwise set `corrected_domain` to null.
- The `best_email` you return MUST use the corrected domain when applicable.
- Cite the source for the corrected domain in `reasoning`.

OUTPUT
Output exactly ONE JSON object as your final message — no prose around it, no markdown fences. Schema:
{
  "best_email": <string or null>,
  "source_url": <string or null>,
  "confidence": <float 0.0-1.0>,
  "alt_candidates": [<string>, ...],
  "corrected_domain": <string or null>,
  "reasoning": <string, 1-3 sentences>
}

CONFIDENCE RUBRIC
- 0.9+ : email seen verbatim on a primary credible source
- 0.6-0.8 : email seen on a less-direct source (third-party article, GitHub, conference)
- 0.3-0.5 : strong indirect signal (e.g., masked broker sighting + domain pattern confirmed for a colleague), but no direct verbatim sighting of THIS person's email
- 0.0-0.2 : nothing found, or only patterns

If nothing found, return best_email=null with confidence=0.0.
"""


def build_user_prompt(row: dict) -> str:
    return (
        f"Find the work email for:\n"
        f"- Name: {row.get('name', '')}\n"
        f"- Role: {row.get('role', '')}\n"
        f"- Company: {row.get('company', '')}\n"
        f"- Domain: {row.get('domain', '')}\n"
        f"- Context: {row.get('notes', '')}\n\n"
        f"Search the web. Output the JSON described in the system prompt."
    )


def web_search_email(client, row: dict) -> dict:
    """Returns {best_email, source_url, confidence, alt_candidates, reasoning}.
    Returns confidence=0 with reason on any error.
    """
    try:
        resp = client.messages.create(
            model=MODEL,
            max_tokens=2048,
            system=[{
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }],
            tools=[{
                "type": "web_search_20250305",
                "name": "web_search",
                "max_uses": WEB_SEARCH_MAX_USES,
            }],
            messages=[{"role": "user", "content": build_user_prompt(row)}],
        )
    except Exception as e:
        return {"best_email": None, "source_url": None, "confidence": 0.0,
                "alt_candidates": [], "reasoning": f"api_error: {type(e).__name__}: {e}"}

    text = ""
    for block in reversed(resp.content):
        if getattr(block, "type", None) == "text":
            text = block.text
            break
    if not text:
        return {"best_email": None, "source_url": None, "confidence": 0.0,
                "alt_candidates": [], "reasoning": "empty response"}

    m = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if not m:
        return {"best_email": None, "source_url": None, "confidence": 0.0,
                "alt_candidates": [], "reasoning": f"no_json: {text[:120]}"}
    try:
        data = json.loads(m.group(0))
    except json.JSONDecodeError as e:
        return {"best_email": None, "source_url": None, "confidence": 0.0,
                "alt_candidates": [], "reasoning": f"bad_json: {e}"}

    return {
        "best_email": _clean_email(data.get("best_email")),
        "source_url": data.get("source_url") or None,
        "confidence": float(data.get("confidence") or 0.0),
        "alt_candidates": [_clean_email(e) for e in (data.get("alt_candidates") or []) if _clean_email(e)],
        "corrected_domain": _clean_domain(data.get("corrected_domain")),
        "reasoning": (data.get("reasoning") or "")[:300],
    }


def _clean_domain(d):
    if not isinstance(d, str):
        return None
    d = d.strip().lower()
    d = re.sub(r"^https?://", "", d)
    d = d.split("/")[0].split("?")[0]
    if not d or "." not in d or " " in d:
        return None
    return d


def _clean_email(e):
    if not isinstance(e, str):
        return None
    e = e.strip().strip("<>").lower()
    if "@" not in e or " " in e:
        return None
    return e


# --- SMTP probe ------------------------------------------------------------


def smtp_probe(domain: str, candidate: str, *, timeout: float = SMTP_TIMEOUT) -> str:
    """Returns one of: 'accepted', 'rejected', 'catchall', 'unreachable'.

    'unreachable' covers port-25-blocked, connection-refused, timeout, and
    any DNS/SMTP error — i.e. SMTP signal is unusable for this domain.
    """
    try:
        import dns.resolver
    except ImportError:
        return "unreachable"
    try:
        answers = dns.resolver.resolve(domain, "MX", lifetime=timeout)
        mxs = sorted(answers, key=lambda r: r.preference)
        if not mxs:
            return "unreachable"
        mx_host = str(mxs[0].exchange).rstrip(".")
    except Exception:
        return "unreachable"

    rand_local = f"probe-{int(time.time() * 1000)}-{random.randint(1000, 9999)}"
    rand_addr = f"{rand_local}@{domain}"
    try:
        s = smtplib.SMTP(mx_host, 25, timeout=timeout)
        try:
            s.helo("probe.local")
            s.docmd("MAIL FROM:<probe@gmail.com>")
            code1, _ = s.docmd(f"RCPT TO:<{candidate}>")
            s.docmd("RSET")
            s.docmd("MAIL FROM:<probe@gmail.com>")
            code2, _ = s.docmd(f"RCPT TO:<{rand_addr}>")
        finally:
            try:
                s.quit()
            except Exception:
                pass
    except (smtplib.SMTPException, socket.error, OSError, ConnectionError):
        return "unreachable"

    cand_ok = 250 <= code1 < 260
    catchall = 250 <= code2 < 260
    if cand_ok and catchall:
        return "catchall"
    if cand_ok:
        return "accepted"
    return "rejected"


# --- main pipeline ---------------------------------------------------------


def reconcile(web: dict, patterns: list[str]) -> tuple[str | None, str, str]:
    """Pick the best candidate. Returns (email, source_url, why).

    Web-search results with explicit citations beat pattern guesses.
    Falls back to top pattern if web search returned nothing usable.

    `source_url` is the literal URL Anthropic cited (https://...) when
    available, else None. The caller assigns a final `email_source` that
    must start with `https://` so send-batch.py picks the row up.
    """
    if web["best_email"] and web["confidence"] >= 0.5:
        return web["best_email"], web["source_url"], "web_high_conf"
    if web["best_email"] and web["source_url"]:
        return web["best_email"], web["source_url"], "web_low_conf"
    if patterns:
        return patterns[0], None, "pattern_fallback"
    return None, None, "no_candidate"


def assign_confidence(source_label: str, smtp_result: str, web_conf: float) -> str:
    """Map (source, smtp, web_conf) -> confidence enum string."""
    if source_label.startswith("web") and smtp_result == "accepted":
        return "verified"
    if source_label.startswith("web") and web_conf >= 0.8:
        return "verified"
    if source_label.startswith("web"):
        return "web"
    if smtp_result == "accepted":
        return "smtp-pattern"
    return "pattern-only"


def main():
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("ERROR: ANTHROPIC_API_KEY not set", file=sys.stderr)
        sys.exit(1)
    try:
        import anthropic
    except ImportError:
        print("ERROR: `anthropic` package not installed. Run: pip3 install -r requirements.txt", file=sys.stderr)
        sys.exit(1)

    client = anthropic.Anthropic()

    with CSV_PATH.open() as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        base_fields = list(reader.fieldnames or [])
    extra_fields = [c for c in ("confidence", "domain_correction") if c not in base_fields]
    fieldnames = base_fields + extra_fields

    targets = rows[:LIMIT] if LIMIT else rows

    LOG_DIR.mkdir(exist_ok=True)
    log_path = LOG_DIR / f"find-{CSV_PATH.stem}.log"
    log_f = log_path.open("w")
    started = time.time()

    def log(line: str) -> None:
        log_f.write(line + "\n")
        log_f.flush()
        if VERBOSE:
            print(line, flush=True)

    counts = {"verified": 0, "web": 0, "smtp-pattern": 0, "pattern-only": 0, "generic": 0}
    smtp_unreachable_count = 0
    domain_corrected_count = 0
    out_rows = []

    out_target = OUT_PATH if OUT_PATH else CSV_PATH
    log(f"model={MODEL} rows={len(targets)} dry_run={DRY_RUN} out={out_target}")

    def snapshot() -> None:
        """Write partial output after each row so a crash doesn't lose work."""
        if DRY_RUN:
            return
        full = [dict(r) for r in rows]
        for idx, processed in enumerate(out_rows):
            full[idx] = processed
        for idx in range(len(out_rows), len(full)):
            full[idx].setdefault("confidence", "")
            full[idx].setdefault("domain_correction", "")
        write_to = OUT_PATH if OUT_PATH else CSV_PATH
        if OUT_PATH is None:
            backup = CSV_PATH.with_suffix(CSV_PATH.suffix + ".bak")
            if not backup.exists():
                backup.write_bytes(CSV_PATH.read_bytes())
        tmp = write_to.with_suffix(write_to.suffix + ".tmp")
        with tmp.open("w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=fieldnames)
            w.writeheader()
            for r in full:
                w.writerow({k: r.get(k, "") for k in fieldnames})
        tmp.replace(write_to)

    for i, raw_row in enumerate(targets, 1):
        row = dict(raw_row)
        name = row.get("name", "")
        original_domain = root_domain(row.get("domain", ""))
        original_email = row.get("email", "") or ""
        original_source = row.get("email_source", "") or ""

        web = web_search_email(client, row)

        # Apply domain correction if Claude proposed one (and it's actually
        # different). All downstream work — patterns, SMTP, output row —
        # uses the corrected domain.
        corrected = web.get("corrected_domain")
        if corrected and root_domain(corrected) != original_domain:
            effective_domain = root_domain(corrected)
            domain_corrected_count += 1
            domain_correction = f"{original_domain} -> {effective_domain}"
        else:
            effective_domain = original_domain
            domain_correction = ""

        patterns = generate_patterns(name, effective_domain)

        # If web returned an email, ensure it lives at the effective domain;
        # otherwise treat it as untrusted (model contradicting its own
        # corrected_domain) and discard.
        web_for_reconcile = dict(web)
        if web["best_email"]:
            be_domain = root_domain(web["best_email"].split("@", 1)[-1])
            if be_domain != effective_domain:
                web_for_reconcile["best_email"] = None

        candidate, cited_url, why = reconcile(web_for_reconcile, patterns)

        if candidate:
            smtp_result = smtp_probe(effective_domain, candidate)
            if smtp_result == "unreachable":
                smtp_unreachable_count += 1
            confidence = assign_confidence(why, smtp_result, web["confidence"])
            new_email = candidate
            if cited_url and cited_url.startswith(("http://", "https://")):
                new_source = cited_url
            elif confidence == "verified":
                new_source = "https://verified-smtp/"
            elif confidence == "web":
                new_source = "https://anthropic-web/"
            elif confidence == "smtp-pattern":
                new_source = "https://smtp-verified/"
            else:  # pattern-only
                new_source = "https://pattern-guess/"
        else:
            smtp_result = "skipped"
            confidence = "generic"
            new_email = original_email
            new_source = original_source

        # Write the corrected domain back into the row's `domain` so
        # downstream send-batch / process-bounces use it.
        row["domain"] = effective_domain
        row["email"] = new_email
        row["email_source"] = new_source
        row["confidence"] = confidence
        row["domain_correction"] = domain_correction
        out_rows.append(row)
        counts[confidence] = counts.get(confidence, 0) + 1

        dom_tag = f" dom:{domain_correction}" if domain_correction else ""
        log(
            f"[{i:>2}/{len(targets)}] {name[:24]:<24} "
            f"{original_email:<32} -> {new_email:<40} "
            f"conf={confidence:<13} smtp={smtp_result:<11} "
            f"web_conf={web['confidence']:.2f}{dom_tag} "
            f"src={(web['source_url'] or '-')[:60]}"
        )
        if web["reasoning"] and (VERBOSE or web["confidence"] < 0.5 or domain_correction):
            log(f"          reason: {web['reasoning'][:240]}")

        snapshot()

        if i < len(targets):
            time.sleep(random.uniform(*INTER_CALL_SLEEP))

    log_f.close()
    elapsed = int(time.time() - started)
    summary = " ".join(f"{k}={v}" for k, v in counts.items() if v)
    dry_tag = " (DRY RUN)" if DRY_RUN else ""
    out_tag = "" if DRY_RUN else f" out={out_target.name}"
    print(
        f"{summary} smtp_unreachable={smtp_unreachable_count} "
        f"domain_corrected={domain_corrected_count} "
        f"elapsed={elapsed}s log={log_path.relative_to(ROOT)}{out_tag}{dry_tag}"
    )


if __name__ == "__main__":
    main()
