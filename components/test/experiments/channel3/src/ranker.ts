import type { Profile } from "./types";

export type RankInput = {
  id: string;
  title: string;
  description: string | null;
  brand: string | null;
  price: number;
  currency: string;
  url: string;
  domain: string;
  commission_rate: number;
  availability: "InStock" | "OutOfStock";
};

export type RankedProduct = RankInput & {
  score: number;
  reasons: string[];
};

const haystack = (p: RankInput): string =>
  `${p.title} ${p.description ?? ""}`.toLowerCase();

// Scores every product without dropping any. Hard violations (avoid_ingredients,
// brand_blocklist) get score = -Infinity so they sort last, but they remain in
// the list so callers can show "rejected" entries to the user for transparency.
export function scoreAll(
  products: RankInput[],
  profile: Profile,
): RankedProduct[] {
  return products.map((p): RankedProduct => {
    const reasons: string[] = [];
    let score = 0;
    const text = haystack(p);

    const blockedIngredient = profile.avoid_ingredients.find((needle) =>
      text.includes(needle.toLowerCase()),
    );
    if (blockedIngredient) {
      return {
        ...p,
        score: Number.NEGATIVE_INFINITY,
        reasons: [`contains avoid_ingredient "${blockedIngredient}"`],
      };
    }

    const blockedBrand = p.brand
      ? profile.brand_blocklist.find((b) =>
          p.brand!.toLowerCase().includes(b.toLowerCase()),
        )
      : undefined;
    if (blockedBrand) {
      return {
        ...p,
        score: Number.NEGATIVE_INFINITY,
        reasons: [`brand "${p.brand}" is in blocklist`],
      };
    }

    for (const required of profile.required_ingredients) {
      if (text.includes(required.toLowerCase())) {
        score += 10;
        reasons.push(`matches required ingredient "${required}"`);
      }
    }

    if (p.brand) {
      const allow = profile.brand_allowlist.find((b) =>
        p.brand!.toLowerCase().includes(b.toLowerCase()),
      );
      if (allow) {
        score += 5;
        reasons.push(`brand "${p.brand}" is on allowlist`);
      }
    }

    if (
      profile.price_ceiling_usd != null &&
      p.price > profile.price_ceiling_usd
    ) {
      const over =
        (p.price - profile.price_ceiling_usd) / profile.price_ceiling_usd;
      score -= over * 20;
      reasons.push(
        `$${p.price} exceeds the $${profile.price_ceiling_usd} ceiling`,
      );
    }

    score += p.commission_rate * 2;

    return { ...p, score, reasons };
  });
}

// What the agent actually picks from: filtered (no -Infinity drops) and sorted.
export function rank(
  products: RankInput[],
  profile: Profile,
): RankedProduct[] {
  return scoreAll(products, profile)
    .filter((p) => p.score !== Number.NEGATIVE_INFINITY)
    .sort((a, b) => b.score - a.score);
}
