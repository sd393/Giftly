import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  SeedFileSchema,
  CacheFileSchema,
  type SeedFile,
  type CacheFile,
  type CacheEntry,
} from "./types";

export const DATA_DIR = resolve(process.cwd(), "data");
export const SEED_PATH = resolve(DATA_DIR, "seed.json");
export const CACHE_PATH = resolve(DATA_DIR, "reviews-cache.json");

export const EMBEDDING_MODEL = "text-embedding-3-large";

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function readSeed(): SeedFile | null {
  if (!existsSync(SEED_PATH)) return null;
  const raw = JSON.parse(readFileSync(SEED_PATH, "utf8"));
  return SeedFileSchema.parse(raw);
}

export function writeSeed(seed: SeedFile): void {
  ensureDir(SEED_PATH);
  writeFileSync(SEED_PATH, JSON.stringify(seed, null, 2) + "\n", "utf8");
}

export function readCache(): CacheFile {
  if (!existsSync(CACHE_PATH)) {
    return { embedding_model: EMBEDDING_MODEL, products: {} };
  }
  const raw = JSON.parse(readFileSync(CACHE_PATH, "utf8"));
  return CacheFileSchema.parse(raw);
}

export function writeCache(cache: CacheFile): void {
  ensureDir(CACHE_PATH);
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + "\n", "utf8");
}

export function upsertCacheEntry(cache: CacheFile, entry: CacheEntry): void {
  cache.products[entry.channel3_product_id] = entry;
}

// Comparison key for "is this the same physical product?" lookups across
// Channel3 listings. Lowercases, strips punctuation, dedupes tokens, sorts —
// so "Fellow Fellow Aiden Precision Coffee Maker" and
// "Fellow Aiden Precision Coffee Maker" land on the same key.
//
// Conservative on purpose: does NOT treat "maker" / "machine" as synonyms
// and does NOT strip color/size words. We prefer cache misses over
// cross-attributing reviews to a different SKU.
export function normalizeKey(brand: string | null, title: string): string {
  const text = `${brand ?? ""} ${title}`.toLowerCase();
  const tokens = text
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0);
  return Array.from(new Set(tokens)).sort().join(" ");
}
