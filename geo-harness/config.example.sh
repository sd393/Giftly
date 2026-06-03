# GEO harness target config. Copy to config.sh and edit, then run bin/geo-audit.sh.
# config.sh is gitignored so per-client targets don't get committed.

# Bare domain (no scheme), used for Trustpilot/SERP/cookie matching.
TARGET_DOMAIN="publicgoods.com"

# Canonical base WITH scheme + host (no trailing slash). All paths are appended to this.
TARGET_WWW="https://www.publicgoods.com"

# Human-readable brand name — used for entity lookups, SERP queries, and prompt substitution.
BRAND_NAME="Public Goods"

# One hero product: PATH for page probes, HANDLE for the .json probe.
HERO_PRODUCT_PATH="/products/natural-shampoo"
HERO_PRODUCT_HANDLE="natural-shampoo"

# A representative category/collection page.
CATEGORY_PATH="/collections/bestsellers"

# Policy / info pages worth probing for crawlability.
POLICY_PATHS=("/pages/shipping" "/pages/faq" "/pages/membership-info")

# Competitor bare domains (for the benchmark + entity comparison).
COMPETITORS=("grove.co" "thrivemarket.com" "blueland.com")

# Competitor brand names (same order as COMPETITORS) for entity-check.
COMPETITOR_NAMES=("Grove Collaborative" "Thrive Market" "Blueland")

# Pages to run the indexability trap on: deprecated / legacy / superseded content
# that may still be indexed and leak outdated claims into AI answers.
WATCH_PAGES=("/pages/legacy-membership")

# UCP/MCP endpoint to probe (leave blank to auto-derive from /.well-known/ucp).
MCP_ENDPOINT="${TARGET_WWW}/api/ucp/mcp"

# A second hero handle for a "shopping intent" prompt (optional).
SECOND_PRODUCT_NAME="dish soap"
