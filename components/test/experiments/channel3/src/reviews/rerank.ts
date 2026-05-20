// Used by the agent at query time: given the user's query and the products
// Channel3 returned, look up cached review embeddings and compute a
// similarity score per product. Products without cached data get null.
//
// THREE-TIER LOOKUP:
//   1. product_id     — direct Channel3 ID match (best, deterministic)
//   2. normalized_key — same physical product, different Channel3 listing
//                       (sorted-token-set of brand+title)
//   3. title_embedding — fuzzy identity match via OpenAI embeddings.
//                        Catches "Coffee Maker" vs "Coffee Machine",
//                        slight title variations, color SKUs, etc.

import OpenAI from "openai";
import { readCache, normalizeKey } from "./store";
import { embed, cosineSimilarity } from "./embed";
import type { CacheFile, CacheEntry } from "./types";

let _cache: CacheFile | null = null;
let _byNormalizedKey: Map<string, CacheEntry> | null = null;
let _titleEmbedded: CacheEntry[] | null = null;

function loadCache(): {
  file: CacheFile;
  byNormalizedKey: Map<string, CacheEntry>;
  titleEmbedded: CacheEntry[];
} {
  if (_cache && _byNormalizedKey && _titleEmbedded) {
    return {
      file: _cache,
      byNormalizedKey: _byNormalizedKey,
      titleEmbedded: _titleEmbedded,
    };
  }
  _cache = readCache();
  _byNormalizedKey = new Map();
  _titleEmbedded = [];
  for (const entry of Object.values(_cache.products)) {
    if (entry.status !== "indexed" || !entry.embedding) continue;
    const key = normalizeKey(entry.brand, entry.title);
    if (!_byNormalizedKey.has(key)) _byNormalizedKey.set(key, entry);
    if (entry.title_embedding) _titleEmbedded.push(entry);
  }
  return {
    file: _cache,
    byNormalizedKey: _byNormalizedKey,
    titleEmbedded: _titleEmbedded,
  };
}

export function reloadCache(): void {
  _cache = null;
  _byNormalizedKey = null;
  _titleEmbedded = null;
}

// Cosine threshold for tier-3 acceptance. Set conservatively to avoid
// cross-attributing reviews between similar-but-distinct products
// (e.g., Bose QC vs Bose QC Ultra). Tunable via env.
const TITLE_MATCH_THRESHOLD = Number(
  process.env.REVIEW_TITLE_MATCH_THRESHOLD ?? "0.85",
);

export type ReviewScore = {
  review_score: number | null;
  review_summary_excerpt: string | null;
  in_cache: boolean;
  cache_status: string | null;
  match_method: "product_id" | "normalized_key" | "title_embedding" | null;
  match_similarity: number | null;
};

export type Candidate = {
  product_id: string;
  brand: string | null;
  title: string;
};

export type ScorerStats = {
  total: number;
  tier1: number;
  tier2: number;
  tier3: number;
  missed: number;
};

export type ScorerResult = {
  score: (product_id: string) => ReviewScore;
  stats: ScorerStats;
};

let _openai: OpenAI | null = null;
function openai(): OpenAI {
  if (!_openai) _openai = new OpenAI();
  return _openai;
}

async function batchEmbed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const res = await openai().embeddings.create({
    model: "text-embedding-3-large",
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}

const NULL_SCORE: ReviewScore = {
  review_score: null,
  review_summary_excerpt: null,
  in_cache: false,
  cache_status: null,
  match_method: null,
  match_similarity: null,
};

function asScoreFromEntry(
  entry: CacheEntry,
  queryVec: number[],
  method: ReviewScore["match_method"],
  matchSimilarity: number | null,
): ReviewScore {
  if (entry.status !== "indexed" || !entry.embedding) {
    return {
      review_score: null,
      review_summary_excerpt: null,
      in_cache: true,
      cache_status: entry.status,
      match_method: method,
      match_similarity: matchSimilarity,
    };
  }
  const sim = cosineSimilarity(queryVec, entry.embedding);
  return {
    review_score: sim,
    review_summary_excerpt: entry.review_summary_text?.slice(0, 400) ?? null,
    in_cache: true,
    cache_status: entry.status,
    match_method: method,
    match_similarity: matchSimilarity,
  };
}

export async function buildReviewScorer(
  query: string,
  candidates: Candidate[],
): Promise<ScorerResult> {
  const { file, byNormalizedKey, titleEmbedded } = loadCache();
  const queryVec = await embed(query);
  const results = new Map<string, ReviewScore>();
  const stats: ScorerStats = {
    total: candidates.length,
    tier1: 0,
    tier2: 0,
    tier3: 0,
    missed: 0,
  };

  // Tier 1 + 2 pass — synchronous map lookups.
  const tier3Pending: Candidate[] = [];
  for (const c of candidates) {
    let entry: CacheEntry | undefined = file.products[c.product_id];
    if (entry) {
      stats.tier1++;
      results.set(c.product_id, asScoreFromEntry(entry, queryVec, "product_id", null));
      continue;
    }

    const key = normalizeKey(c.brand, c.title);
    entry = byNormalizedKey.get(key);
    if (entry) {
      stats.tier2++;
      results.set(c.product_id, asScoreFromEntry(entry, queryVec, "normalized_key", null));
      continue;
    }

    tier3Pending.push(c);
  }

  // Tier 3 pass — batched embeddings + NN search.
  if (tier3Pending.length > 0 && titleEmbedded.length > 0) {
    const inputs = tier3Pending.map((c) =>
      `${c.brand ?? ""} ${c.title}`.trim(),
    );
    const vecs = await batchEmbed(inputs);

    for (let i = 0; i < tier3Pending.length; i++) {
      const c = tier3Pending[i];
      const cVec = vecs[i];
      let bestEntry: CacheEntry | null = null;
      let bestSim = TITLE_MATCH_THRESHOLD;
      for (const entry of titleEmbedded) {
        const sim = cosineSimilarity(cVec, entry.title_embedding!);
        if (sim > bestSim) {
          bestSim = sim;
          bestEntry = entry;
        }
      }
      if (bestEntry) {
        stats.tier3++;
        results.set(
          c.product_id,
          asScoreFromEntry(bestEntry, queryVec, "title_embedding", bestSim),
        );
      } else {
        stats.missed++;
        results.set(c.product_id, NULL_SCORE);
      }
    }
  } else {
    // No tier-3 candidates (or no embedded entries to match against).
    for (const c of tier3Pending) {
      stats.missed++;
      results.set(c.product_id, NULL_SCORE);
    }
  }

  return {
    score: (product_id: string): ReviewScore => results.get(product_id) ?? NULL_SCORE,
    stats,
  };
}
