import Channel3 from "@channel3/sdk";
import type { Profile } from "./types";

// Lazy singleton so tests can inject a fake before first real use.
let _client: Channel3 | null = null;

export function getClient(): Channel3 {
  if (_client) return _client;
  const apiKey = process.env.CHANNEL3_API_KEY;
  if (!apiKey) {
    throw new Error(
      "CHANNEL3_API_KEY is not set. Sign up at https://trychannel3.com/sign-up, copy your key from the dashboard, then add it to .env.",
    );
  }
  _client = new Channel3({ apiKey });
  return _client;
}

// Test seam — set a fake client (or null to reset).
export function __setClient(client: Channel3 | null): void {
  _client = client;
}

export function buildSearchBody(query: string, profile: Profile, limit = 10) {
  // Push every constraint we can into the API to save credits and reduce
  // client-side filtering. The ranker only handles things the API cannot,
  // like ingredient substring matching.
  return {
    query,
    limit,
    filters: {
      ...(profile.price_ceiling_usd != null
        ? { price: { max_price: profile.price_ceiling_usd } }
        : {}),
      ...(profile.in_stock_only ? { availability: ["InStock" as const] } : {}),
      // brand_blocklist holds human-readable names, but the API expects
      // Channel3 brand IDs. Resolving names → IDs would cost an extra
      // /v1/brands/search call per entry, so we keep brand blocking
      // client-side in the ranker instead.
    },
    config: {
      country: profile.country as never,
      currency: profile.currency as never,
    },
  };
}

export async function searchProducts(
  query: string,
  profile: Profile,
  limit = 10,
) {
  const page = await getClient().products.search(
    buildSearchBody(query, profile, limit),
  );
  return page.products ?? [];
}

export async function lookupByUrl(url: string) {
  const res = await getClient().products.lookup({ url });
  return res.product;
}
