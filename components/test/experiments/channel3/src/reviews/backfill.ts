// One-shot script: for every indexed cache entry that lacks a title_embedding,
// compute one. Single batched OpenAI call, ~2 seconds for ~80 entries.
//
// Usage: pnpm reviews:backfill

import "dotenv/config";
import OpenAI from "openai";
import { readCache, writeCache, EMBEDDING_MODEL } from "./store";

async function main() {
  const cache = readCache();
  const needsEmbed = Object.values(cache.products).filter(
    (p) => p.status === "indexed" && p.embedding && !p.title_embedding,
  );

  if (needsEmbed.length === 0) {
    console.log("✓ All indexed entries already have title_embedding.");
    return;
  }

  console.log(`Embedding ${needsEmbed.length} entries' brand+title in one batched call…`);

  const inputs = needsEmbed.map((e) => `${e.brand ?? ""} ${e.title}`.trim());
  const openai = new OpenAI();
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: inputs,
  });

  for (let i = 0; i < needsEmbed.length; i++) {
    const entry = needsEmbed[i];
    cache.products[entry.channel3_product_id] = {
      ...entry,
      title_embedding: res.data[i].embedding,
      title_embedding_model: EMBEDDING_MODEL,
    };
  }
  writeCache(cache);
  console.log(`✓ Backfilled ${needsEmbed.length} title_embeddings.`);
}

main().catch((err) => {
  console.error(
    `backfill failed: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
});
