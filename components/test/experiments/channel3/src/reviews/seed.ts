// Read queries.txt, run each query (plus LLM-paraphrased variants) against
// Channel3, collect unique products into data/seed.json. This is what the
// build pipeline iterates over.
//
// Paraphrasing matters: the agent at query time generates 2-3 sub-queries
// per user prompt with different keywords, and each surfaces different
// Channel3 product_ids. Seeding with only the original phrasing leaves the
// cache underpopulated for the same user query. Paraphrasing in the seed
// step mirrors the agent's behavior so cache coverage tracks usage.
//
// Usage: pnpm reviews:seed
//        pnpm reviews:seed --no-paraphrase     (only the original queries)
//        pnpm reviews:seed --paraphrases 4     (default 3)
//        pnpm reviews:seed --limit 5           (only first N queries)
//        pnpm reviews:seed --per-query 8       (top N products per query)

import "dotenv/config";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import OpenAI from "openai";
import { getClient } from "../channel3";
import { writeSeed } from "./store";
import type { SeedFile, SeedProduct } from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const QUERIES_PATH = resolve(ROOT, "queries.txt");

type Args = {
  limit: number;
  perQuery: number;
  paraphrase: boolean;
  paraphrases: number;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    limit: Infinity,
    perQuery: 8,
    paraphrase: true,
    paraphrases: 3,
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--limit") args.limit = Number(argv[++i]);
    else if (argv[i] === "--per-query") args.perQuery = Number(argv[++i]);
    else if (argv[i] === "--no-paraphrase") args.paraphrase = false;
    else if (argv[i] === "--paraphrases") args.paraphrases = Number(argv[++i]);
  }
  return args;
}

function readQueries(): string[] {
  if (!existsSync(QUERIES_PATH)) {
    throw new Error(`queries.txt not found at ${QUERIES_PATH}`);
  }
  return readFileSync(QUERIES_PATH, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

let _openai: OpenAI | null = null;
function openai(): OpenAI {
  if (!_openai) _openai = new OpenAI();
  return _openai;
}

async function paraphraseQuery(query: string, n: number): Promise<string[]> {
  const completion = await openai().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Return ONLY a JSON object: {"paraphrases": [string, ...]} with exactly ${n} rewrites of the user's product search query. Each rewrite should preserve the intent but use different keywords or phrasing (synonyms, related categories, different specificity). Don't include the original.`,
      },
      { role: "user", content: query },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });
  const raw = JSON.parse(completion.choices[0].message.content ?? "{}");
  if (!Array.isArray(raw.paraphrases)) return [];
  return raw.paraphrases.filter((s: unknown): s is string => typeof s === "string");
}

async function searchChannel3(
  query: string,
  perQuery: number,
): Promise<SeedProduct[]> {
  const page = await getClient().products.search({ query, limit: perQuery });
  return (page.products ?? []).map(
    (p): SeedProduct => ({
      id: p.id,
      title: p.title,
      brand: p.brands?.[0]?.name ?? null,
      description: p.description ?? null,
      categories: p.categories ?? [],
      offer_domains: Array.from(
        new Set((p.offers ?? []).map((o) => domainOf(o.url)).filter(Boolean)),
      ),
      first_seen_query: query,
    }),
  );
}

async function main() {
  const { limit, perQuery, paraphrase, paraphrases } = parseArgs(
    process.argv.slice(2),
  );
  const allQueries = readQueries();
  const queries = allQueries.slice(0, limit);

  console.log(
    `Seeding from ${queries.length} of ${allQueries.length} queries (${perQuery} products/query, paraphrase=${paraphrase}${paraphrase ? `, ${paraphrases} variants/query` : ""})\n`,
  );

  const products: Record<string, SeedProduct> = {};
  const queryRecords: SeedFile["queries"] = [];

  for (const query of queries) {
    const variants: string[] = [query];
    if (paraphrase) {
      try {
        process.stdout.write(`▸ "${query}"\n  paraphrasing ... `);
        const more = await paraphraseQuery(query, paraphrases);
        variants.push(...more);
        console.log(`got ${more.length} variants`);
        for (const v of more) console.log(`    → "${v}"`);
      } catch (err) {
        console.log(`  paraphrase failed (${err instanceof Error ? err.message : String(err)}); continuing with original only`);
      }
    } else {
      process.stdout.write(`▸ "${query}"\n`);
    }

    const allIds = new Set<string>();
    for (const variant of variants) {
      process.stdout.write(`  channel3 "${variant.slice(0, 60)}${variant.length > 60 ? "…" : ""}" ... `);
      const found = await searchChannel3(variant, perQuery);
      let newIds = 0;
      for (const p of found) {
        allIds.add(p.id);
        if (!products[p.id]) {
          products[p.id] = p;
          newIds++;
        }
      }
      console.log(`${found.length} products (${newIds} new)`);
    }
    queryRecords.push({ query, product_ids: Array.from(allIds) });
  }

  const seed: SeedFile = {
    generated_at: new Date().toISOString(),
    queries: queryRecords,
    products,
  };
  writeSeed(seed);

  const total = Object.keys(products).length;
  console.log(
    `\n✓ Wrote ${total} unique products across ${queries.length} queries to data/seed.json`,
  );
}

main().catch((err) => {
  console.error(`seed failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
