// Channel3 "baseline" pick — the raw top result of their semantic search,
// no LLM intervention, no review-aware re-ranking. Used by the UI's Compare
// mode to show what Channel3 alone would have recommended for the same query.
//
// This is deliberately apples-to-apples with /api/agent's chosen product:
// same query string, same Channel3 search, just no rerank and no LLM tool
// loop. Whatever Channel3 puts at position 0 is the "pick".

import { NextResponse } from "next/server";
import { getClient } from "../../../src/channel3";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = { query?: string };

function bestOffer<T extends { price?: { price?: number } }>(
  offers: T[],
): T | null {
  if (offers.length === 0) return null;
  return [...offers].sort(
    (a, b) => (a.price?.price ?? Infinity) - (b.price?.price ?? Infinity),
  )[0];
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const query = (body.query ?? "").trim();
  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  try {
    const page = await getClient().products.search({ query, limit: 5 });
    const products = page.products ?? [];
    if (products.length === 0) {
      return NextResponse.json(
        { error: "Channel3 returned no products for this query" },
        { status: 404 },
      );
    }

    const top = products[0];
    const inStock = (top.offers ?? []).filter(
      (o) => o.availability === "InStock",
    );
    const topOffer = bestOffer(inStock.length ? inStock : top.offers ?? []);
    if (!topOffer) {
      return NextResponse.json(
        { error: "no offers available for Channel3's top pick" },
        { status: 404 },
      );
    }

    const image =
      top.images?.find((i) => i.is_main_image)?.url ??
      top.images?.[0]?.url ??
      null;

    const alternatives = products.slice(1).map((p) => {
      const offers = p.offers ?? [];
      const cheapest = bestOffer(offers);
      return {
        title: p.title,
        price: cheapest?.price?.price ?? 0,
        checkout_url: cheapest?.url ?? "",
      };
    });

    const chosen = {
      product_id: top.id,
      title: top.title,
      brand: top.brands?.[0]?.name ?? null,
      price: topOffer.price?.price ?? 0,
      currency: topOffer.price?.currency ?? "USD",
      checkout_url: topOffer.url,
      domain: topOffer.domain,
      max_commission_rate: topOffer.max_commission_rate ?? 0,
      reason:
        "Channel3's top-ranked semantic-search result for this query. No LLM reasoning, no review-aware re-ranking — straight from their index.",
      alternatives,
    };

    return NextResponse.json({ chosen, image });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
