"use client";

import { useState, type FormEvent } from "react";

type SearchProduct = {
  id: string;
  title: string;
  description: string | null;
  brand: string | null;
  price: number;
  currency: string;
  url: string;
  domain: string;
  image: string | null;
  availability: string;
};

type ChosenProduct = {
  product_id: string;
  title: string;
  brand: string | null;
  price: number;
  currency: string;
  checkout_url: string;
  domain: string;
  max_commission_rate: number;
  reason: string;
  alternatives: Array<{ title: string; price: number; checkout_url: string }>;
};

type Profile = {
  skin_type?: string;
  avoid_ingredients: string[];
  required_ingredients: string[];
  brand_allowlist: string[];
  brand_blocklist: string[];
  price_ceiling_usd?: number;
  in_stock_only: boolean;
  country: string;
  currency: string;
  notes?: string;
};

type ConsideredProduct = {
  product_id: string;
  title: string;
  brand: string | null;
  price: number;
  currency: string;
  domain: string;
  url: string;
  commission_rate: number;
  score: number | null;
  reasons: string[];
  dropped: boolean;
  first_seen_query: string;
  review_score: number | null;
  review_summary_excerpt: string | null;
};

type AgentResult = {
  chosen: ChosenProduct;
  considered: ConsideredProduct[];
  image: string | null;
  profileUsed: Profile;
};

type BaselineResult = {
  chosen: ChosenProduct;
  image: string | null;
};

type Mode = "browse" | "agent" | "compare";

function formatPrice(price: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(price);
  } catch {
    return `${currency} ${price.toFixed(2)}`;
  }
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("browse");
  const [query, setQuery] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [inStockOnly, setInStockOnly] = useState(true);

  const [products, setProducts] = useState<SearchProduct[]>([]);
  const [agent, setAgent] = useState<AgentResult | null>(null);
  const [baseline, setBaseline] = useState<BaselineResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  async function runBrowse(q: string) {
    const body: Record<string, unknown> = { query: q, inStockOnly };
    const parsedMax = Number(maxPrice);
    if (Number.isFinite(parsedMax) && parsedMax > 0) body.maxPrice = parsedMax;
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || "error" in data) {
      throw new Error("error" in data ? data.error : `${res.status} ${res.statusText}`);
    }
    return data.products as SearchProduct[];
  }

  async function runAgent(q: string) {
    const res = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q }),
    });
    const data = await res.json();
    if (!res.ok || "error" in data) {
      throw new Error("error" in data ? data.error : `${res.status} ${res.statusText}`);
    }
    return data as AgentResult;
  }

  async function runBaseline(q: string) {
    const res = await fetch("/api/baseline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q }),
    });
    const data = await res.json();
    if (!res.ok || "error" in data) {
      throw new Error("error" in data ? data.error : `${res.status} ${res.statusText}`);
    }
    return data as BaselineResult;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setProducts([]);
    setAgent(null);
    setBaseline(null);
    setHasSearched(true);
    try {
      if (mode === "browse") {
        const list = await runBrowse(trimmed);
        setProducts(list);
      } else if (mode === "agent") {
        const result = await runAgent(trimmed);
        setAgent(result);
      } else {
        // compare mode: run agent + baseline in parallel
        const [agentRes, baselineRes] = await Promise.all([
          runAgent(trimmed),
          runBaseline(trimmed),
        ]);
        setAgent(agentRes);
        setBaseline(baselineRes);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Channel3 shopping</h1>
        <p className="text-sm text-neutral-500 mt-1">
          {mode === "browse"
            ? "Search the catalog. Click a card to buy on the merchant's site."
            : mode === "agent"
              ? "Describe what you want. The agent applies your profile and returns one pick."
              : "Run the same query through both your agent and Channel3's raw top result. See where they agree and disagree."}
        </p>
      </header>

      {/* Mode toggle */}
      <div className="mb-4 inline-flex rounded-lg border border-neutral-200 bg-white p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode("browse")}
          className={`rounded-md px-4 py-1.5 transition ${
            mode === "browse"
              ? "bg-neutral-900 text-white"
              : "text-neutral-600 hover:text-neutral-900"
          }`}
        >
          Browse
        </button>
        <button
          type="button"
          onClick={() => setMode("agent")}
          className={`rounded-md px-4 py-1.5 transition ${
            mode === "agent"
              ? "bg-neutral-900 text-white"
              : "text-neutral-600 hover:text-neutral-900"
          }`}
        >
          Ask the agent
        </button>
        <button
          type="button"
          onClick={() => setMode("compare")}
          className={`rounded-md px-4 py-1.5 transition ${
            mode === "compare"
              ? "bg-neutral-900 text-white"
              : "text-neutral-600 hover:text-neutral-900"
          }`}
        >
          Compare vs Channel3
        </button>
      </div>

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-3 mb-8 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
      >
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              mode === "browse"
                ? 'Try "hyaluronic acid serum"'
                : 'Try "fragrance-free moisturizer for combination skin under $35"'
            }
            className="flex-1 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-base focus:border-neutral-900 focus:outline-none"
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="rounded-lg bg-neutral-900 px-5 py-2 text-sm font-medium text-white transition disabled:opacity-50"
          >
            {loading
              ? mode === "browse"
                ? "Searching…"
                : "Thinking…"
              : mode === "browse"
                ? "Search"
                : mode === "agent"
                  ? "Ask"
                  : "Compare"}
          </button>
        </div>

        {mode === "browse" && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-neutral-700">
            <label className="flex items-center gap-2">
              <span className="text-neutral-600">Max price</span>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                min={0}
                placeholder="—"
                className="w-24 rounded-md border border-neutral-300 px-2 py-1 text-sm focus:border-neutral-900 focus:outline-none"
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="h-4 w-4"
              />
              <span>In stock only</span>
            </label>
          </div>
        )}

        {(mode === "agent" || mode === "compare") && (
          <p className="text-xs text-neutral-500">
            {mode === "agent"
              ? "Agent mode runs an LLM tool loop with review-aware re-ranking — slower (~10–30s) but applies your profile and review data."
              : "Compare runs the same query through both your agent (with reviews + LLM) and Channel3's raw search top-1 (no reviews, no LLM). About ~15–30s."}
          </p>
        )}
      </form>

      {loading && (mode === "agent" || mode === "compare") && (
        <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
          {mode === "agent"
            ? "Agent is searching Channel3 and weighing options against review data…"
            : "Running your agent and Channel3 baseline in parallel…"}
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Agent hero card */}
      {/* Comparison banner — only in compare mode when both results are in */}
      {mode === "compare" && agent && baseline && (
        <div
          className={`mb-4 rounded-lg border p-3 text-sm ${
            agent.chosen.product_id === baseline.chosen.product_id
              ? "border-neutral-200 bg-neutral-50 text-neutral-700"
              : "border-indigo-200 bg-indigo-50 text-indigo-900"
          }`}
        >
          {agent.chosen.product_id === baseline.chosen.product_id ? (
            <>
              <span className="font-medium">Agent and Channel3 agreed.</span>{" "}
              Both picked <em>{agent.chosen.title}</em>.
            </>
          ) : (
            <>
              <span className="font-medium">Agent and Channel3 disagreed.</span>{" "}
              The review-aware agent picked something different from Channel3&apos;s raw top result — scroll down to see both.
            </>
          )}
        </div>
      )}

      {/* Agent hero card (always rendered when `agent` is set, in both agent and compare modes) */}
      {agent && (
        <section className="mb-8 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="grid gap-0 md:grid-cols-[280px_1fr]">
            <div className="aspect-square bg-neutral-100 md:aspect-auto">
              {agent.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={agent.image}
                  alt={agent.chosen.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
                  no image
                </div>
              )}
            </div>
            <div className="flex flex-col gap-4 p-6">
              <div>
                <div className="text-xs uppercase tracking-wide text-neutral-500">
                  Agent&apos;s pick
                </div>
                <div className="mt-1 text-xl font-semibold leading-tight">
                  {agent.chosen.title}
                </div>
                <div className="mt-1 text-sm text-neutral-500">
                  {agent.chosen.brand ?? agent.chosen.domain}
                </div>
              </div>

              <div className="text-2xl font-semibold">
                {formatPrice(agent.chosen.price, agent.chosen.currency)}
              </div>

              <div className="rounded-lg bg-neutral-50 p-3 text-sm text-neutral-700">
                <span className="font-medium text-neutral-900">Why this one: </span>
                {agent.chosen.reason}
              </div>

              {(() => {
                const chosenInCache = agent.considered.find(
                  (c) => c.product_id === agent.chosen.product_id,
                );
                if (chosenInCache?.review_summary_excerpt) {
                  return (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-sm text-neutral-700">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="font-medium text-neutral-900">
                          What customers say
                        </span>
                        {chosenInCache.review_score != null && (
                          <span className="text-[10px] uppercase tracking-wide text-emerald-700">
                            review match {(chosenInCache.review_score * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <div className="whitespace-pre-line text-xs leading-relaxed text-neutral-700">
                        {chosenInCache.review_summary_excerpt}
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-800">
                    No review data cached for this product yet.
                  </div>
                );
              })()}

              <a
                href={agent.chosen.checkout_url}
                target="_blank"
                rel="noopener noreferrer"
                className="self-start rounded-lg bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-700 transition"
              >
                Buy on {agent.chosen.domain} →
              </a>

              {agent.chosen.alternatives.length > 0 && (
                <div className="mt-2 border-t border-neutral-100 pt-4">
                  <div className="mb-2 text-xs uppercase tracking-wide text-neutral-500">
                    Alternatives the agent considered
                  </div>
                  <ul className="space-y-1.5 text-sm">
                    {agent.chosen.alternatives.map((alt, i) => (
                      <li key={i} className="flex items-center justify-between">
                        <a
                          href={alt.checkout_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-neutral-700 hover:text-neutral-900 hover:underline truncate"
                        >
                          {alt.title}
                        </a>
                        <span className="ml-3 shrink-0 text-neutral-500">
                          {formatPrice(alt.price, agent.chosen.currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Raw JSON inspectors */}
          <div className="border-t border-neutral-100 bg-neutral-50/60 px-6 py-4">
            <details className="group">
              <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-neutral-600 hover:text-neutral-900 select-none flex items-center gap-2">
                <span className="inline-block transition group-open:rotate-90">▶</span>
                Chosen product (raw JSON)
              </summary>
              <pre className="mt-3 max-h-96 overflow-auto rounded-lg border border-neutral-200 bg-white p-3 font-mono text-[11px] leading-relaxed text-neutral-800">
                {JSON.stringify(agent.chosen, null, 2)}
              </pre>
            </details>

            <details className="group mt-3">
              <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-neutral-600 hover:text-neutral-900 select-none flex items-center gap-2">
                <span className="inline-block transition group-open:rotate-90">▶</span>
                Considered but not picked (
                {agent.considered.filter((c) => c.product_id !== agent.chosen.product_id).length})
                {(() => {
                  const droppedCount = agent.considered.filter(
                    (c) => c.dropped && c.product_id !== agent.chosen.product_id,
                  ).length;
                  return droppedCount > 0 ? (
                    <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-800">
                      {droppedCount} dropped by profile
                    </span>
                  ) : null;
                })()}
              </summary>
              <pre className="mt-3 max-h-96 overflow-auto rounded-lg border border-neutral-200 bg-white p-3 font-mono text-[11px] leading-relaxed text-neutral-800">
                {JSON.stringify(
                  agent.considered.filter((c) => c.product_id !== agent.chosen.product_id),
                  null,
                  2,
                )}
              </pre>
            </details>
          </div>
        </section>
      )}

      {/* Baseline (Channel3's raw top pick) — only in compare mode */}
      {baseline && (
        <section className="mb-8 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="grid gap-0 md:grid-cols-[280px_1fr]">
            <div className="aspect-square bg-neutral-100 md:aspect-auto">
              {baseline.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={baseline.image}
                  alt={baseline.chosen.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
                  no image
                </div>
              )}
            </div>
            <div className="flex flex-col gap-4 p-6">
              <div>
                <div className="text-xs uppercase tracking-wide text-neutral-500">
                  Channel3 baseline (raw, no rerank)
                </div>
                <div className="mt-1 text-xl font-semibold leading-tight">
                  {baseline.chosen.title}
                </div>
                <div className="mt-1 text-sm text-neutral-500">
                  {baseline.chosen.brand ?? baseline.chosen.domain}
                </div>
              </div>

              <div className="text-2xl font-semibold">
                {formatPrice(baseline.chosen.price, baseline.chosen.currency)}
              </div>

              <div className="rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600">
                {baseline.chosen.reason}
              </div>

              <a
                href={baseline.chosen.checkout_url}
                target="_blank"
                rel="noopener noreferrer"
                className="self-start rounded-lg border border-neutral-900 px-5 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-900 hover:text-white transition"
              >
                Buy on {baseline.chosen.domain} →
              </a>

              {baseline.chosen.alternatives.length > 0 && (
                <div className="mt-2 border-t border-neutral-100 pt-4">
                  <div className="mb-2 text-xs uppercase tracking-wide text-neutral-500">
                    Channel3&apos;s next 4 results
                  </div>
                  <ul className="space-y-1.5 text-sm">
                    {baseline.chosen.alternatives.map((alt, i) => (
                      <li key={i} className="flex items-center justify-between">
                        <a
                          href={alt.checkout_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-neutral-700 hover:text-neutral-900 hover:underline"
                        >
                          {alt.title}
                        </a>
                        <span className="ml-3 shrink-0 text-neutral-500">
                          {formatPrice(alt.price, baseline.chosen.currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Browse result grid */}
      {products.length > 0 && (
        <>
          <p className="mb-4 text-xs text-neutral-500">
            {products.length} {products.length === 1 ? "result" : "results"}
          </p>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <a
                key={p.id}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:border-neutral-400 hover:shadow-sm"
              >
                <div className="aspect-square bg-neutral-100">
                  {p.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={p.image}
                      alt={p.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
                      no image
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <div className="mb-1 truncate text-xs text-neutral-500">
                    {p.brand ?? p.domain}
                  </div>
                  <div className="mb-2 line-clamp-2 text-sm font-medium text-neutral-900">
                    {p.title}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">
                      {formatPrice(p.price, p.currency)}
                    </div>
                    {p.availability !== "InStock" && (
                      <div className="text-[10px] uppercase tracking-wide text-amber-700">
                        {p.availability}
                      </div>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </>
      )}

      {!loading && !error && hasSearched && !agent && !baseline && products.length === 0 && (
        <p className="text-sm text-neutral-500">No results — try a different query.</p>
      )}
    </main>
  );
}
