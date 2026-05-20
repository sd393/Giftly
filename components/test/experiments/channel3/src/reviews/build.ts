// For each product in data/seed.json, run the full review pipeline:
//   1. Tavily search (scoped to retailer/aggregator domains)
//   2. LLM verification of each hit
//   3. LLM aggregation/summary of verified hits
//   4. OpenAI embedding of the summary text
// Stored to data/reviews-cache.json (success + failure records).
//
// Usage: pnpm reviews:build
//        pnpm reviews:build --force         (re-do products already in cache)
//        pnpm reviews:build --limit 10      (only N products this run)

import "dotenv/config";
import {
  readSeed,
  readCache,
  writeCache,
  upsertCacheEntry,
  EMBEDDING_MODEL,
} from "./store";
import { searchReviews } from "./tavily";
import { verifyMatch } from "./verify";
import { summarizeReviews, summaryToEmbedText } from "./summarize";
import { embed } from "./embed";
import type { CacheEntry, SeedProduct } from "./types";

type Args = { force: boolean; limit: number; minVerified: number };

function parseArgs(argv: string[]): Args {
  const args: Args = { force: false, limit: Infinity, minVerified: 2 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--force") args.force = true;
    else if (argv[i] === "--limit") args.limit = Number(argv[++i]);
    else if (argv[i] === "--min-verified") args.minVerified = Number(argv[++i]);
  }
  return args;
}

function timestamp(): string {
  return new Date().toISOString();
}

async function processProduct(
  p: SeedProduct,
  minVerified: number,
): Promise<CacheEntry> {
  const base: Omit<CacheEntry, "status"> = {
    channel3_product_id: p.id,
    brand: p.brand,
    title: p.title,
    attempted_at: timestamp(),
    review_summary: null,
    review_summary_text: null,
    embedding: null,
    embedding_model: null,
    error_message: null,
  };

  try {
    // Step 1: search
    const hits = await searchReviews({
      brand: p.brand,
      title: p.title,
      maxResults: 8,
    });
    if (hits.length === 0) {
      return { ...base, status: "no_reviews_found" };
    }

    // Step 2: verify each hit in parallel (cheap mini calls)
    const verifications = await Promise.all(
      hits.map(async (h) => ({
        hit: h,
        decision: await verifyMatch({
          brand: p.brand,
          title: p.title,
          channel3_offer_domains: p.offer_domains,
          hit: h,
        }),
      })),
    );
    const verified = verifications
      .filter((v) => v.decision.match && v.decision.confidence !== "low")
      .map((v) => v.hit);

    if (verified.length < minVerified) {
      return {
        ...base,
        status: "low_confidence",
        error_message: `only ${verified.length}/${hits.length} hits passed verification (need ${minVerified})`,
      };
    }

    // Step 3: summarize
    const summary = await summarizeReviews({
      brand: p.brand,
      title: p.title,
      verified_hits: verified,
    });

    // Step 4: embed
    const embedText = summaryToEmbedText({
      brand: p.brand,
      title: p.title,
      summary,
    });
    const embedding = await embed(embedText);

    // Step 5: also embed the product identity (brand + title) for tier-3
    // fuzzy lookup at query time. Catches title variants like "Coffee Maker"
    // vs "Coffee Machine" that the strict normalized-key match misses.
    const titleEmbedding = await embed(`${p.brand ?? ""} ${p.title}`.trim());

    return {
      ...base,
      status: "indexed",
      review_summary: summary,
      review_summary_text: embedText,
      embedding,
      embedding_model: EMBEDDING_MODEL,
      title_embedding: titleEmbedding,
      title_embedding_model: EMBEDDING_MODEL,
    };
  } catch (err) {
    return {
      ...base,
      status: "error",
      error_message: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main() {
  const { force, limit, minVerified } = parseArgs(process.argv.slice(2));
  const seed = readSeed();
  if (!seed) {
    console.error("data/seed.json not found. Run `pnpm reviews:seed` first.");
    process.exit(2);
  }

  const cache = readCache();
  const allProducts = Object.values(seed.products);
  const toProcess = allProducts
    .filter((p) => force || !cache.products[p.id])
    .slice(0, limit);

  console.log(
    `Processing ${toProcess.length} products (${allProducts.length} in seed, ${Object.keys(cache.products).length} already in cache, force=${force})\n`,
  );

  const stats: Record<string, number> = {};
  let i = 0;
  for (const p of toProcess) {
    i++;
    process.stdout.write(`[${i}/${toProcess.length}] ${p.brand ?? ""} ${p.title} ... `);
    const entry = await processProduct(p, minVerified);
    upsertCacheEntry(cache, entry);
    writeCache(cache); // persist after every product so a crash doesn't lose work
    stats[entry.status] = (stats[entry.status] ?? 0) + 1;
    const detail =
      entry.status === "indexed"
        ? `${entry.review_summary?.review_count_seen} reviews from ${entry.review_summary?.sources.join(", ")}`
        : entry.error_message ?? entry.status;
    console.log(`${entry.status} — ${detail}`);
  }

  console.log("\n──────────────");
  console.log("Summary:");
  for (const [status, count] of Object.entries(stats)) {
    console.log(`  ${status}: ${count}`);
  }
  console.log(`\n✓ Cache written to data/reviews-cache.json`);
}

main().catch((err) => {
  console.error(`build failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
