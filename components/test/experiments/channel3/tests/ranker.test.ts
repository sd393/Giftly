import { describe, it, expect } from "vitest";
import { rank, type RankInput } from "../src/ranker.js";
import { ProfileSchema } from "../src/types.js";

const baseProduct = (overrides: Partial<RankInput> = {}): RankInput => ({
  id: "p1",
  title: "Hydrating Moisturizer",
  description: "A lightweight cream with niacinamide and ceramides.",
  brand: "Acme Beauty",
  price: 30,
  currency: "USD",
  url: "https://example.com/p1",
  domain: "example.com",
  commission_rate: 0.05,
  availability: "InStock",
  ...overrides,
});

describe("ranker", () => {
  it("drops products containing an avoid_ingredient", () => {
    const profile = ProfileSchema.parse({ avoid_ingredients: ["fragrance"] });
    const products = [
      baseProduct({ id: "ok" }),
      baseProduct({
        id: "bad",
        description: "Contains fragrance and water.",
      }),
    ];
    const result = rank(products, profile);
    expect(result.map((p) => p.id)).toEqual(["ok"]);
  });

  it("drops products from blocklisted brands by substring", () => {
    const profile = ProfileSchema.parse({ brand_blocklist: ["acme"] });
    const result = rank([baseProduct()], profile);
    expect(result).toHaveLength(0);
  });

  it("scores required_ingredient matches higher", () => {
    const profile = ProfileSchema.parse({
      required_ingredients: ["niacinamide"],
    });
    const products = [
      baseProduct({ id: "with", description: "Contains niacinamide." }),
      baseProduct({ id: "without", description: "Just water and oil." }),
    ];
    const result = rank(products, profile);
    expect(result[0].id).toBe("with");
    expect(result[0].reasons.some((r) => r.includes("niacinamide"))).toBe(true);
  });

  it("applies a soft price penalty when over the ceiling", () => {
    const profile = ProfileSchema.parse({ price_ceiling_usd: 20 });
    const cheap = baseProduct({ id: "cheap", price: 15 });
    const overpriced = baseProduct({ id: "expensive", price: 40 });
    const result = rank([cheap, overpriced], profile);
    expect(result[0].id).toBe("cheap");
    // Overpriced is penalized but still present (soft cut).
    expect(result.find((p) => p.id === "expensive")).toBeDefined();
  });

  it("prefers products with higher commission as a tiebreak", () => {
    const profile = ProfileSchema.parse({});
    const products = [
      baseProduct({ id: "low", commission_rate: 0.01 }),
      baseProduct({ id: "high", commission_rate: 0.1 }),
    ];
    const result = rank(products, profile);
    expect(result[0].id).toBe("high");
  });

  it("handles a null description without crashing", () => {
    const profile = ProfileSchema.parse({ avoid_ingredients: ["fragrance"] });
    const result = rank([baseProduct({ description: null })], profile);
    expect(result).toHaveLength(1);
  });

  it("returns empty when every product is blocked", () => {
    const profile = ProfileSchema.parse({
      avoid_ingredients: ["niacinamide"],
    });
    const result = rank(
      [
        baseProduct({ description: "with niacinamide" }),
        baseProduct({ id: "p2", description: "also niacinamide" }),
      ],
      profile,
    );
    expect(result).toHaveLength(0);
  });
});
