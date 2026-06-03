#!/usr/bin/env bash
# geo-mcp-probe.sh — Layer 2. Probe a UCP/MCP endpoint: does it exist, is it gated,
# and what tools would it expose? Maps the auth gate by walking the error progression.
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib/common.sh"
require_var TARGET_WWW

EP="${MCP_ENDPOINT:-$TARGET_WWW/api/ucp/mcp}"
out="$GEO_OUT/mcp-probe.txt"

post() { curl -sS -X POST "$EP" -H "Content-Type: application/json" -d "$1" -w "\n[http %{http_code}]\n" --max-time 25; }

{
echo "=== UCP/MCP endpoint probe — $EP ==="
echo ""
echo "-- 1. anonymous tools/list --"
post '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
echo ""
echo "-- 2. with a (bogus) agent profile in params.arguments.meta.ucp-agent --"
post '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{"arguments":{"meta":{"ucp-agent":{"profile":"https://example.com/agent.json"}}}}}'
echo ""
echo "READ:"
echo "  HTTP 404                       -> no MCP endpoint (not UCP-enabled)."
echo "  tools list returned            -> OPEN endpoint (rare); capture the tool names."
echo "  422 'UCP discovery failed'     -> GATED. The error code progresses as you supply more:"
echo "    invalid_profile_url  (Missing profile uri)  -> profile must go in"
echo "                         params.arguments.meta['ucp-agent'].profile (NOT an HTTP header)"
echo "    version_unsupported  (Missing ucp version)  -> profile doc needs a top-level version"
echo "    profile_malformed    (Invalid cache control) -> profile must be served"
echo "                         cache-control: public, max-age>=60, over HTTPS, no redirects, signed."
echo "  => A gated endpoint cannot be used by today's ChatGPT/agents anonymously; they fall back"
echo "     to scraping. The store implements the canonical UCP Shopping methods regardless:"
echo "     search_catalog, lookup_catalog, get_product, {create,get,update,cancel}_cart,"
echo "     {create,get,update,complete,cancel}_checkout, get_order."
} | tee "$out"
echo "-> $out"
