#!/usr/bin/env bash
# geo-reddit.sh — Layer 4. Pull upvotes + top comments for Reddit threads via per-thread JSON.
# Reddit's SEARCH api is useless (returns a generic feed); discover thread URLs first with a
# headed Google "site:reddit.com <brand> <topic>" search (see bin/geo-serp.sh / METHODOLOGY),
# then pass the thread paths here.
#
# Usage: bin/geo-reddit.sh /r/Sub/comments/abc123/slug [more-paths-or-full-urls...]
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib/common.sh"

[ "$#" -ge 1 ] || { echo "Usage: $0 <thread-path-or-url> [more...]"; echo "Discover paths via a headed Google 'site:reddit.com ${BRAND_NAME:-<brand>}' search first."; exit 1; }
out="$GEO_OUT/reddit-threads.txt"
: > "$out"

for t in "$@"; do
  # accept full URL or path
  path=$(echo "$t" | sed -E 's#^https?://(www\.)?reddit\.com##; s#/$##; s#\?.*##')
  curl -sS -A "$UA_BROWSER" --max-time 25 "https://www.reddit.com${path}.json?limit=4" | python3 -c "
import json,sys,datetime
raw=sys.stdin.read()
try:
    d=json.loads(raw,strict=False)
    p=d[0]['data']['children'][0]['data']
    print('THREAD:',p['title'])
    print('  r/'+p['subreddit'],'|',p['score'],'upvotes |',p['num_comments'],'comments |',
          datetime.datetime.utcfromtimestamp(p['created_utc']).strftime('%Y-%m'),'| ratio',p.get('upvote_ratio'))
    body=(p.get('selftext') or '').replace(chr(10),' ').strip()
    if body: print('  OP:',body[:280])
    for c in d[1]['data']['children'][:3]:
        cd=c.get('data',{})
        if cd.get('body'): print('  C('+str(cd.get('score'))+'up):',cd['body'].replace(chr(10),' ')[:260])
    print()
except Exception as e:
    print('  ERROR/blocked:',e); print()
" | tee -a "$out"
done
echo ""
echo "READ: prioritize 20+ upvote threads (most likely in AI training data). Tag the dominant"
echo "subreddits — they reveal the audience whose language the AI will echo. Capture verbatim"
echo "high-signal phrases (scam/fraud/can't-cancel/suppress-reviews) — these surface in answers."
echo "-> $out"
