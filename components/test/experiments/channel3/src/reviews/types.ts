import { z } from "zod";

// ──────────────────────────────────────────────────────────────────────────
// Seed: products to attempt to index, collected from running queries.txt
// against Channel3.
// ──────────────────────────────────────────────────────────────────────────

export const SeedProductSchema = z.object({
  id: z.string(),
  title: z.string(),
  brand: z.string().nullable(),
  description: z.string().nullable(),
  categories: z.array(z.string()),
  offer_domains: z.array(z.string()),
  first_seen_query: z.string(),
});
export type SeedProduct = z.infer<typeof SeedProductSchema>;

export const SeedFileSchema = z.object({
  generated_at: z.string(),
  queries: z.array(z.object({ query: z.string(), product_ids: z.array(z.string()) })),
  products: z.record(z.string(), SeedProductSchema),
});
export type SeedFile = z.infer<typeof SeedFileSchema>;

// ──────────────────────────────────────────────────────────────────────────
// Verification: LLM output when checking whether a Tavily search result
// is actually about the right product.
// ──────────────────────────────────────────────────────────────────────────

export const VerifyDecisionSchema = z.object({
  match: z.boolean(),
  confidence: z.enum(["high", "medium", "low"]),
  reason: z.string(),
});
export type VerifyDecision = z.infer<typeof VerifyDecisionSchema>;

// ──────────────────────────────────────────────────────────────────────────
// Final review summary the LLM produces after aggregating all verified
// review snippets for a product. This is what gets embedded.
// ──────────────────────────────────────────────────────────────────────────

export const ReviewSummarySchema = z.object({
  common_praise: z.array(z.string()),
  common_complaints: z.array(z.string()),
  edge_cases: z.array(z.string()),
  use_cases: z.array(z.string()),
  approximate_rating: z.number().nullable(),
  review_count_seen: z.number(),
  sources: z.array(z.string()),
  confidence: z.enum(["high", "medium", "low"]),
});
export type ReviewSummary = z.infer<typeof ReviewSummarySchema>;

// ──────────────────────────────────────────────────────────────────────────
// Cached entry: one record per product we attempted, success or failure.
// ──────────────────────────────────────────────────────────────────────────

export type IndexStatus =
  | "indexed"
  | "no_reviews_found"
  | "low_confidence"
  | "error";

export const CacheEntrySchema = z.object({
  channel3_product_id: z.string(),
  brand: z.string().nullable(),
  title: z.string(),
  attempted_at: z.string(),
  status: z.enum(["indexed", "no_reviews_found", "low_confidence", "error"]),
  review_summary: ReviewSummarySchema.nullable(),
  review_summary_text: z.string().nullable(),
  embedding: z.array(z.number()).nullable(),
  embedding_model: z.string().nullable(),
  error_message: z.string().nullable(),
  // Optional. Embedding of "<brand> <title>" — used at query time for
  // fuzzy product-identity matching (tier 3 fallback after exact id and
  // normalized brand+title). Backfilled by `reviews:backfill`.
  title_embedding: z.array(z.number()).nullable().optional(),
  title_embedding_model: z.string().nullable().optional(),
});
export type CacheEntry = z.infer<typeof CacheEntrySchema>;

export const CacheFileSchema = z.object({
  embedding_model: z.string(),
  products: z.record(z.string(), CacheEntrySchema),
});
export type CacheFile = z.infer<typeof CacheFileSchema>;
