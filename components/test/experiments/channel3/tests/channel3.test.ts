import { describe, it, expect } from "vitest";
import { buildSearchBody } from "../src/channel3.js";
import { ProfileSchema } from "../src/types.js";

describe("buildSearchBody", () => {
  it("pushes price_ceiling_usd into filters.price.max_price", () => {
    const profile = ProfileSchema.parse({ price_ceiling_usd: 35 });
    const body = buildSearchBody("moisturizer", profile);
    expect(body.filters.price).toEqual({ max_price: 35 });
  });

  it("requires in-stock by default", () => {
    const profile = ProfileSchema.parse({});
    const body = buildSearchBody("moisturizer", profile);
    expect(body.filters.availability).toEqual(["InStock"]);
  });

  it("omits availability when in_stock_only is false", () => {
    const profile = ProfileSchema.parse({ in_stock_only: false });
    const body = buildSearchBody("moisturizer", profile);
    expect(body.filters.availability).toBeUndefined();
  });

  it("does NOT send brand_blocklist to the API (handled in the ranker)", () => {
    const profile = ProfileSchema.parse({ brand_blocklist: ["Acme"] });
    const body = buildSearchBody("moisturizer", profile);
    expect("exclude_brand_ids" in body.filters).toBe(false);
  });

  it("forwards locale config from the profile", () => {
    const profile = ProfileSchema.parse({ country: "GB", currency: "GBP" });
    const body = buildSearchBody("moisturizer", profile);
    expect(body.config).toMatchObject({ country: "GB", currency: "GBP" });
  });

  it("respects an explicit limit", () => {
    const profile = ProfileSchema.parse({});
    const body = buildSearchBody("moisturizer", profile, 5);
    expect(body.limit).toBe(5);
  });
});
