#!/usr/bin/env bash
# Shared helpers for the GEO harness. Sourced by every bin/ script.

# Resolve harness root (the dir containing bin/ lib/ config.sh).
GEO_ROOT="${GEO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

# Output dir for all probe results.
GEO_OUT="${GEO_OUT:-$GEO_ROOT/geo-out}"
mkdir -p "$GEO_OUT"

# Load target config if present (scripts also guard on required vars).
if [ -f "$GEO_ROOT/config.sh" ]; then
  # shellcheck disable=SC1091
  source "$GEO_ROOT/config.sh"
fi

# --- AI crawler user-agents (the four that matter for GEO) ---
UA_GPTBOT="Mozilla/5.0 AppleWebKit/537.36 (compatible; GPTBot/1.2; +https://openai.com/gptbot)"
UA_CLAUDEBOT="Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)"
UA_PERPLEXITY="Mozilla/5.0 AppleWebKit/537.36 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)"
UA_OAISEARCH="Mozilla/5.0 AppleWebKit/537.36 (compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)"
# A plausible desktop browser UA for control comparisons / API calls.
UA_BROWSER="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"

# URL-encode a string (stdlib python3).
urlenc() { python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$1"; }

# Copy a file to the clipboard if a clipboard tool is available (no-op otherwise).
clip() {
  if command -v wl-copy >/dev/null 2>&1; then wl-copy < "$1" && echo "[clipboard: wl-copy]";
  elif command -v xclip >/dev/null 2>&1; then xclip -selection clipboard < "$1" && echo "[clipboard: xclip]";
  elif command -v pbcopy >/dev/null 2>&1; then pbcopy < "$1" && echo "[clipboard: pbcopy]";
  else echo "[clipboard: no tool found — file at $1]"; fi
}

# Locate the gstack browse binary (headed browser probes). Empty if not installed.
browse_bin() {
  local b
  b="$(git rev-parse --show-toplevel 2>/dev/null)/.claude/skills/gstack/browse/dist/browse"
  [ -x "$b" ] && { echo "$b"; return; }
  b="$HOME/.claude/skills/gstack/browse/dist/browse"
  [ -x "$b" ] && { echo "$b"; return; }
  echo ""
}

# Guard: die with a message if a required config var is unset.
require_var() { local v="$1"; [ -n "${!v:-}" ] || { echo "ERROR: set $v in config.sh (copy config.example.sh)"; exit 1; }; }
