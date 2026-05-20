import { NextResponse } from "next/server";
import { getClient } from "../../../src/channel3";

export const runtime = "nodejs";

type Body = {
  query?: string;
  maxPrice?: number;
  inStockOnly?: boolean;
};

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
    const page = await getClient().products.search({
      query,
      limit: 20,
      filters: {
        ...(body.inStockOnly !== false
          ? { availability: ["InStock" as const] }
          : {}),
        ...(typeof body.maxPrice === "number" && body.maxPrice > 0
          ? { price: { max_price: body.maxPrice } }
          : {}),
      },
    });

    const products = (page.products ?? []).map((p) => {
      const offers = p.offers ?? [];
      const inStock = offers.filter((o) => o.availability === "InStock");
      const pool = inStock.length ? inStock : offers;
      const best = [...pool].sort(
        (a, b) => (a.price?.price ?? Infinity) - (b.price?.price ?? Infinity),
      )[0];
      const mainImage =
        p.images?.find((i) => i.is_main_image)?.url ??
        p.images?.[0]?.url ??
        null;

      return {
        id: p.id,
        title: p.title,
        description: p.description ?? null,
        brand: p.brands?.[0]?.name ?? null,
        price: best?.price?.price ?? 0,
        currency: best?.price?.currency ?? "USD",
        url: best?.url ?? "",
        domain: best?.domain ?? "",
        image: mainImage,
        availability: best?.availability ?? "Unknown",
      };
    });

    return NextResponse.json({ products });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
