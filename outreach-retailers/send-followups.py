#!/usr/bin/env python3
"""Bulk follow-up sender for outreach-retailers/.

Strategy:
  1. Build {recipient_email -> latest original gmail message ID} from sent folder.
  2. Classify inbox replies as real vs auto (OOO/automatic/delay).
  3. From outreach-log.csv, target every retailer-domain row that is not BOUNCED
     and has no REAL reply. Auto-replies still get a follow-up.
  4. For each target, send the follow-up body as a true reply via
     `gog gmail send --reply-to-message-id <id> --reply-all`. Gmail threads the
     reply with In-Reply-To/References headers; --reply-all re-CCs the team
     (Samarjit/Ethan/Shamit) so they see continued engagement.

Usage:
  GOG_KEYRING_PASSWORD=... ./send-followups.py             # actually send
  GOG_KEYRING_PASSWORD=... ./send-followups.py --dry-run   # plan-only, no send

Outputs:
  - Summary to stdout (counts + first few targets)
  - Per-row detail to logs/followup-<date>.log
  - Updates outreach-log.csv: appends note "followed_up <date>" to the row's notes
"""
import csv, json, os, random, re, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from pathlib import Path

ROOT = Path(__file__).parent
LOG = ROOT / 'outreach-log.csv'
LOG_DIR = ROOT / 'logs'
ACCOUNT = os.environ.get('GOG_ACCOUNT', 'armaan.priyadarshan.29@dartmouth.edu')
DRY_RUN = '--dry-run' in sys.argv

EMAIL_RE = re.compile(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}')
AUTO_REPLY_RE = re.compile(
    r'(automatic reply|out of office|ooo|delay in response|auto-?reply'
    r'|returning \d|on leave|i am out|currently out|will be out)',
    re.IGNORECASE,
)
PERSONAL_DOMAINS = {
    'gmail.com', 'yahoo.com', 'hotmail.com', 'mac.com', 'icloud.com',
    'rcn.com', 'outlook.com', 'aol.com',
}

# Follow-up body (kept in sync with send-batch.py's FOLLOWUP_BODY_TMPL)
FOLLOWUP_BODY = """Hi,

Just wanted to follow up in case this message got lost in your inbox. We're working with brands valued over $300M+ and leading AI shopping platforms.

Would love to schedule a quick chat to discuss how retailers, marketplaces and brands are approaching agentic commerce.

Thanks,
Armaan
"""
FOLLOWUP_BODY_HTML = """<p>Hi,</p>
<p>Just wanted to follow up in case this message got lost in your inbox. We're working with brands valued over $300M+ and leading AI shopping platforms.</p>
<p>Would love to schedule a quick chat to discuss how retailers, marketplaces and brands are approaching agentic commerce.</p>
<p>Thanks,<br>Armaan</p>
"""

SUBJECT_QUERIES = [
    # in:anywhere catches sent + trashed (some bounces auto-trashed without DSN match).
    # We filter by from: during metadata fetch to drop inbound replies.
    'subject:"Dartmouth Student Inquiry" in:anywhere after:2026/05/19',
]
INBOX_QUERIES = [
    'subject:"Dartmouth Student Inquiry" in:inbox after:2026/05/19 -from:mailer-daemon',
]


def run(cmd, timeout=120):
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)


def search_ids(query):
    r = run(['gog', '--account', ACCOUNT, 'gmail', 'messages', 'search',
             query, '--json', '--all', '--max', '1000'])
    try:
        d = json.loads(r.stdout)
        return [m['id'] for m in (d if isinstance(d, list) else d.get('messages', []))]
    except Exception:
        return []


def fetch_meta(mid):
    r = run(['gog', '--account', ACCOUNT, 'gmail', 'get', mid,
             '--format', 'metadata', '--json'])
    try:
        d = json.loads(r.stdout)
        h = d.get('headers', {})
        # date as internalDate (epoch ms) for sorting; fallback to Date header
        msg = d.get('message', {})
        internal_date = int(msg.get('internalDate', '0')) if msg.get('internalDate') else 0
        return {
            'id': mid,
            'to': (h.get('to') or '').lower(),
            'from': (h.get('from') or '').lower(),
            'subject': h.get('subject') or '',
            'date_ms': internal_date,
        }
    except Exception:
        return None


def extract_email(field):
    m = EMAIL_RE.search(field or '')
    return m.group(0).lower() if m else None


def main():
    LOG_DIR.mkdir(exist_ok=True)
    out_log = LOG_DIR / f'followup-{date.today().isoformat()}.log'

    # 1. Gather sent IDs across both subject variants
    sent_ids = set()
    for q in SUBJECT_QUERIES:
        sent_ids.update(search_ids(q))
    print(f'[1/4] sent_message_ids={len(sent_ids)}', file=sys.stderr)

    # 2. Fetch metadata; build {email -> most recent {id, subject}}
    with ThreadPoolExecutor(max_workers=20) as ex:
        metas = [m for m in ex.map(fetch_meta, sent_ids) if m]

    sent_by_email = {}  # email -> meta (keep most recent by date_ms)
    for m in metas:
        em = extract_email(m['to'])
        if not em:
            continue
        # Filter: only keep messages we sent (drop inbound replies that share the subject)
        sender = extract_email(m['from'])
        if sender != ACCOUNT.lower():
            continue
        cur = sent_by_email.get(em)
        if not cur or m['date_ms'] > cur['date_ms']:
            sent_by_email[em] = m
    print(f'[2/4] unique_recipients={len(sent_by_email)}', file=sys.stderr)

    # 3. Gather inbox replies; classify
    inbox_ids = set()
    for q in INBOX_QUERIES:
        inbox_ids.update(search_ids(q))
    with ThreadPoolExecutor(max_workers=20) as ex:
        inbox_metas = [m for m in ex.map(fetch_meta, inbox_ids) if m]

    # Exclude self/team
    EXCLUDED = {
        ACCOUNT.lower(),
        'samarjit.deshmukh.29@dartmouth.edu',
        'ethanpzhou@berkeley.edu',
        'shamitd@stanford.edu',
        'armaanp4423@gmail.com',
    }
    real_repliers = set()
    auto_repliers = set()
    for m in inbox_metas:
        sender = extract_email(m['from'])
        if not sender or sender in EXCLUDED:
            continue
        if AUTO_REPLY_RE.search(m['subject']):
            auto_repliers.add(sender)
        else:
            real_repliers.add(sender)
    print(f'[3/4] real_replies={len(real_repliers)} auto_replies={len(auto_repliers)}',
          file=sys.stderr)

    # 4. Build target list from CSV — only 2026-05-19 sends, exclude Roy Schmidt referrals
    TARGET_DATE = '2026-05-19'
    rows = list(csv.DictReader(LOG.open()))
    targets = []  # list of (csv_row, sent_meta)
    skip_reasons = {'wrong_date': 0, 'roy_schmidt': 0, 'bounced': 0,
                    'real_reply': 0, 'personal_domain': 0,
                    'no_send_record': 0, 'duplicate': 0}
    seen = set()
    for r in rows:
        em = (r.get('email') or '').strip().lower()
        if not em or em in seen:
            if em in seen:
                skip_reasons['duplicate'] += 1
            continue
        seen.add(em)
        if (r.get('date_sent') or '').strip() != TARGET_DATE:
            skip_reasons['wrong_date'] += 1
            continue
        notes = (r.get('notes') or '').lower()
        if 'roy schmidt' in notes:
            skip_reasons['roy_schmidt'] += 1
            continue
        if r.get('verified', '').strip().upper() == 'BOUNCED':
            skip_reasons['bounced'] += 1
            continue
        domain = em.split('@', 1)[1] if '@' in em else ''
        if domain in PERSONAL_DOMAINS:
            skip_reasons['personal_domain'] += 1
            continue
        if em in real_repliers:
            skip_reasons['real_reply'] += 1
            continue
        sent_meta = sent_by_email.get(em)
        if not sent_meta:
            skip_reasons['no_send_record'] += 1
            continue
        targets.append((r, sent_meta))

    print(f'[4/4] targets={len(targets)} (skipped: {skip_reasons})', file=sys.stderr)
    print(file=sys.stderr)
    print('First 10 targets:', file=sys.stderr)
    for r, sm in targets[:10]:
        auto_tag = ' [auto-reply earlier]' if r['email'].lower() in auto_repliers else ''
        print(f"  {r['email']:<45} subject={sm['subject'][:50]!r}{auto_tag}", file=sys.stderr)

    if DRY_RUN:
        print('\nDRY RUN — no sends performed.', file=sys.stderr)
        return

    # Actually send
    if 'GOG_KEYRING_PASSWORD' not in os.environ:
        print('ERROR: GOG_KEYRING_PASSWORD not set', file=sys.stderr)
        sys.exit(1)

    log_f = out_log.open('w')

    def log(line):
        log_f.write(line + '\n')
        log_f.flush()

    sent = failed = 0
    failures = []
    for i, (r, sm) in enumerate(targets, 1):
        em = r['email'].strip()
        cmd = [
            'gog', '--account', ACCOUNT, 'gmail', 'send',
            '--reply-to-message-id', sm['id'],
            '--reply-all',
            '--subject', sm['subject'],
            '--body', FOLLOWUP_BODY,
            '--body-html', FOLLOWUP_BODY_HTML,
        ]
        try:
            proc = run(cmd, timeout=90)
        except Exception as e:
            log(f'[{i:>3}/{len(targets)}] FAIL {em:<45} {type(e).__name__}: {e}')
            failed += 1
            failures.append((em, str(e)[:80]))
            continue
        if proc.returncode == 0:
            sent += 1
            log(f'[{i:>3}/{len(targets)}] OK   {em:<45} {proc.stdout.strip()[:80]}')
        else:
            failed += 1
            info = (proc.stderr or proc.stdout).strip()[:200]
            log(f'[{i:>3}/{len(targets)}] FAIL {em:<45} {info}')
            failures.append((em, info[:80]))
        # jitter 1.5-3s — Workspace can take more, but avoid spam triggers
        if i < len(targets):
            time.sleep(random.uniform(1.5, 3.0))

    log_f.close()

    # Update outreach-log.csv: mark followed-up rows
    today = date.today().isoformat()
    target_emails = {r['email'].strip().lower() for r, _ in targets}
    fieldnames = list(rows[0].keys())
    updated = 0
    for r in rows:
        em = (r.get('email') or '').strip().lower()
        if em in target_emails:
            note = r.get('notes', '') or ''
            tag = f'followed_up {today}'
            if tag not in note:
                r['notes'] = f'{note}; {tag}' if note else tag
                updated += 1
    with LOG.open('w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)

    print(f'\nsent={sent} failed={failed} csv_updated={updated} log={out_log.relative_to(ROOT)}')
    for em, info in failures[:5]:
        print(f'  fail: {em} - {info}')


if __name__ == '__main__':
    main()
