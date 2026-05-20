import OpenAI from "openai";
import type { Profile, ChosenProduct } from "./types";
import { searchProducts, lookupByUrl } from "./channel3";
import { rank, scoreAll, type RankInput } from "./ranker";
import { buildReviewScorer, type ReviewScore } from "./reviews/rerank";

const buildSystemPrompt = (profile: Profile): string => `You are a shopping agent.

Your job: take the user's request, search Channel3 for matching products, then pick the single best one and return a final JSON answer. The user's current request is the primary directive — let it drive what you search for and what you pick.

OPTIONAL SAVED CONTEXT (the user's stored preferences — use only where directly relevant to the current request; the request itself always takes priority and can override any of these):
${JSON.stringify(profile, null, 2)}

CAPABILITIES YOU DO NOT HAVE:
- You CANNOT place orders. You return a checkout_url the user opens themselves.
- You CANNOT ask the user follow-up questions during this turn. Make the best interpretation of their request and proceed.

TOOLS:
- search_products({query}) - semantic search Channel3. Pre-ranked, but trust your own judgment about which is the best fit for the user's request. Returns up to 30 candidates per call.
- lookup_product({url}) - full details for a known product URL; only use if the user pasted a URL.

SIGNALS ATTACHED TO EACH SEARCH RESULT:
- score: deterministic profile-fit score (higher = closer to saved preferences). Often near-zero when profile is empty — informational, not decisive.
- review_score: cosine similarity (0-1) between the user's CURRENT request and the product's review-summary embedding. This is the strongest signal we have for whether real customers would say "yes, this matches what the user asked for." A review_score of 0.6+ is strong; below 0.3 is weak. NULL means we don't have review data for that product yet — treat as missing data, not as bad.
- review_summary: 300-character excerpt of the review distribution we have on file. Read it before picking.

PICK STRATEGY:
- STRONGLY prefer products with a non-null review_score over those with null. Reviewed products are the ones we have real customer-feedback evidence for; null means we don't know. Default behavior: pick from products with review_score > 0.3 if ANY exist in the candidate set. Only fall back to a null-review product when no reviewed candidate is a reasonable match for the user's request.
- Among reviewed products, weight review_score heavily. A product with review_score 0.65 should usually beat one with review_score 0.35.
- The review_summary tells you what real customers say. If the user asked for "comfortable headphones" and the summary mentions "tight clamping force" as a common complaint, that's a strong signal to pick a different product.

SEARCH STRATEGY:
- Run AT LEAST 2 search calls before picking, with different phrasings or related categories. Single-query runs miss too many good options.
- Only stop after multiple searches if results are clearly converging on the same products.

FINAL OUTPUT:
When you have a chosen product, return ONLY a JSON object (no prose, no code fences) with this shape:
{
  "product_id": string,
  "title": string,
  "brand": string | null,
  "price": number,
  "currency": string,
  "checkout_url": string,
  "domain": string,
  "max_commission_rate": number,
  "reason": string,
  "alternatives": [{"title": string, "price": number, "checkout_url": string}]
}`;

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_products",
      description:
        "Search Channel3 for products matching a natural-language query. Returns up to 30 ranked candidates. Call multiple times with varied phrasings (synonyms, related categories) to widen the pool before picking — single-query runs often miss good options.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Natural-language search query. Phrase it however best matches what the user asked for; use synonyms across multiple calls if needed.",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "lookup_product",
      description: "Look up full product details for a known product URL.",
      parameters: {
        type: "object",
        properties: { url: { type: "string" } },
        required: ["url"],
      },
    },
  },
];

type SdkProduct = Awaited<ReturnType<typeof searchProducts>>[number];

function toRankInput(detail: SdkProduct): RankInput | null {
  const offers = detail.offers ?? [];
  const inStock = offers.filter((o) => o.availability === "InStock");
  const pool = inStock.length ? inStock : offers;
  const best = [...pool].sort(
    (a, b) => (a.price?.price ?? Infinity) - (b.price?.price ?? Infinity),
  )[0];
  if (!best) return null;
  return {
    id: detail.id,
    title: detail.title,
    description: detail.description ?? null,
    brand: detail.brands?.[0]?.name ?? null,
    price: best.price?.price ?? 0,
    currency: best.price?.currency ?? "USD",
    url: best.url,
    domain: best.domain,
    commission_rate: best.max_commission_rate ?? 0,
    availability: best.availability,
  };
}

export type ConsideredProduct = {
  product_id: string;
  title: string;
  brand: string | null;
  price: number;
  currency: string;
  domain: string;
  url: string;
  commission_rate: number;
  // null when the product was dropped by a hard constraint (score would have
  // been -Infinity, which doesn't serialize cleanly to JSON).
  score: number | null;
  reasons: string[];
  dropped: boolean;
  first_seen_query: string;
  // Review-based re-rank signal. Cosine similarity (0-1) between the user's
  // query and the cached review-summary embedding. Null if the product has
  // no cached reviews yet.
  review_score: number | null;
  review_summary_excerpt: string | null;
};

export type AgentRun = {
  chosen: ChosenProduct;
  considered: ConsideredProduct[];
};

function stripCodeFences(s: string): string {
  const t = s.trim();
  if (!t.startsWith("```")) return t;
  return t
    .replace(/^```(?:json)?\s*\n?/, "")
    .replace(/```\s*$/, "")
    .trim();
}

export async function runAgent(
  userRequest: string,
  profile: Profile,
): Promise<AgentRun> {
  const openai = new OpenAI();
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: buildSystemPrompt(profile) },
    { role: "user", content: userRequest },
  ];

  // Deduped record of every product the agent saw via search_products /
  // lookup_product, with its rank score and the query that first surfaced it.
  // Returned to the caller so the UI can show "what else was on the table".
  const considered = new Map<string, ConsideredProduct>();

  async function runTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<string> {
    if (name === "search_products") {
      const query = String(args.query ?? "");
      // Always pull a wide slate per query so the "considered" set is
      // meaningful. 30 is Channel3's per-call max.
      const limit = 30;
      process.stderr.write(`[search_products] query="${query}" limit=${limit}\n`);
      const products = await searchProducts(query, profile, limit);
      process.stderr.write(
        `[search_products] channel3 returned ${products.length} products\n`,
      );

      // Compute review-based score for each Channel3 result. One query embed
      // per search call, then cosine-sim per product against cached review
      // embeddings. Products without cached reviews → review_score: null.
      const candidates = products.map((p) => ({
        product_id: p.id,
        brand: p.brands?.[0]?.name ?? null,
        title: p.title,
      }));
      let reviewScoreFor: (id: string) => ReviewScore;
      try {
        const scorer = await buildReviewScorer(query, candidates);
        reviewScoreFor = scorer.score;
        const s = scorer.stats;
        const hits = s.tier1 + s.tier2 + s.tier3;
        process.stderr.write(
          `[search_products] review cache: ${hits}/${s.total} hits (t1=${s.tier1} t2=${s.tier2} t3=${s.tier3}, ${s.missed} miss)\n`,
        );
      } catch (err) {
        process.stderr.write(
          `[search_products] review rerank skipped: ${err instanceof Error ? err.message : String(err)}\n`,
        );
        reviewScoreFor = () => ({
          review_score: null,
          review_summary_excerpt: null,
          in_cache: false,
          cache_status: null,
          match_method: null,
          match_similarity: null,
        });
      }

      // Capture EVERY raw Channel3 result into considered — including those
      // without offers (which toRankInput would otherwise silently drop).
      for (const p of products) {
        if (considered.has(p.id)) continue;
        const rs = reviewScoreFor(p.id);
        const ri = toRankInput(p);
        if (ri) {
          const [scored] = scoreAll([ri], profile);
          const dropped = scored.score === Number.NEGATIVE_INFINITY;
          considered.set(p.id, {
            product_id: p.id,
            title: p.title,
            brand: ri.brand,
            price: ri.price,
            currency: ri.currency,
            domain: ri.domain,
            url: ri.url,
            commission_rate: ri.commission_rate,
            score: dropped ? null : scored.score,
            reasons: scored.reasons,
            dropped,
            first_seen_query: query,
            review_score: rs.review_score,
            review_summary_excerpt: rs.review_summary_excerpt,
          });
        } else {
          considered.set(p.id, {
            product_id: p.id,
            title: p.title,
            brand: p.brands?.[0]?.name ?? null,
            price: 0,
            currency: "USD",
            domain: "",
            url: "",
            commission_rate: 0,
            score: null,
            reasons: ["no available offers in this locale"],
            dropped: true,
            first_seen_query: query,
            review_score: rs.review_score,
            review_summary_excerpt: rs.review_summary_excerpt,
          });
        }
      }

      // The LLM only sees survivors (the rank() filtered list).
      const inputs = products
        .map(toRankInput)
        .filter((p): p is RankInput => p !== null);
      const ranked = rank(inputs, profile);
      const projection = ranked.map((r) => {
        const rs = reviewScoreFor(r.id);
        return {
          product_id: r.id,
          title: r.title,
          brand: r.brand,
          price: r.price,
          currency: r.currency,
          domain: r.domain,
          url: r.url,
          commission_rate: r.commission_rate,
          score: r.score,
          reasons: r.reasons,
          // Review-similarity signal — heavily weighted in the user's mental
          // model. Null when this product isn't in the review cache yet.
          review_score: rs.review_score,
          review_summary: rs.review_summary_excerpt,
        };
      });
      // Sort the LLM-visible projection by review_score (when available),
      // falling back to the rank score. This puts review-relevant products
      // at the top of what the LLM sees.
      projection.sort((a, b) => {
        const ar = a.review_score ?? -Infinity;
        const br = b.review_score ?? -Infinity;
        if (ar !== br) return br - ar;
        return b.score - a.score;
      });
      return JSON.stringify(projection);
    }
    if (name === "lookup_product") {
      const url = String(args.url ?? "");
      const detail = await lookupByUrl(url);
      const input = toRankInput(detail);
      if (!input) {
        return JSON.stringify({ error: "no offers found for that URL" });
      }
      if (!considered.has(input.id)) {
        considered.set(input.id, {
          product_id: input.id,
          title: input.title,
          brand: input.brand,
          price: input.price,
          currency: input.currency,
          domain: input.domain,
          url: input.url,
          commission_rate: input.commission_rate,
          score: 0,
          reasons: ["surfaced via lookup_product"],
          dropped: false,
          first_seen_query: `lookup:${url}`,
          review_score: null,
          review_summary_excerpt: null,
        });
      }
      return JSON.stringify(input);
    }
    return JSON.stringify({ error: `unknown tool: ${name}` });
  }

  for (let iter = 0; iter < 5; iter++) {
    const completion = await openai.chat.completions.create({
      model,
      messages,
      tools: TOOLS,
      tool_choice: "auto",
    });
    const msg = completion.choices[0].message;
    messages.push(msg);

    if (completion.usage) {
      process.stderr.write(
        `[iter ${iter}] tokens in=${completion.usage.prompt_tokens} out=${completion.usage.completion_tokens}\n`,
      );
    }

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      const raw = stripCodeFences(msg.content ?? "");
      const chosen = JSON.parse(raw) as ChosenProduct;
      // Sort: (1) not-dropped before dropped, (2) has-review before no-review,
      // (3) higher review_score wins, (4) fall back to ranker score.
      const consideredList = Array.from(considered.values()).sort((a, b) => {
        if (a.dropped !== b.dropped) return a.dropped ? 1 : -1;
        const aRev = a.review_score != null;
        const bRev = b.review_score != null;
        if (aRev !== bRev) return aRev ? -1 : 1;
        if (aRev && bRev) {
          const ar = a.review_score ?? 0;
          const br = b.review_score ?? 0;
          if (ar !== br) return br - ar;
        }
        return (b.score ?? 0) - (a.score ?? 0);
      });
      return { chosen, considered: consideredList };
    }

    for (const call of msg.tool_calls) {
      if (call.type !== "function") continue;
      const args = JSON.parse(call.function.arguments) as Record<
        string,
        unknown
      >;
      const result = await runTool(call.function.name, args);
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: result,
      });
    }
  }
  throw new Error(
    "agent exceeded 5 iterations without producing a final answer",
  );
}
