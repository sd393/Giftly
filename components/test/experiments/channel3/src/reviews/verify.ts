import OpenAI from "openai";
import { VerifyDecisionSchema, type VerifyDecision } from "./types";
import type { ReviewSearchHit } from "./tavily";

let _openai: OpenAI | null = null;
function client(): OpenAI {
  if (!_openai) _openai = new OpenAI();
  return _openai;
}

// Cheap, fast verifier — one call per search result. We deliberately use
// gpt-4o-mini regardless of OPENAI_MODEL so this stays cheap when running
// over hundreds of results.
const VERIFY_MODEL = "gpt-4o-mini";

export async function verifyMatch(args: {
  brand: string | null;
  title: string;
  channel3_offer_domains: string[];
  hit: ReviewSearchHit;
}): Promise<VerifyDecision> {
  const { brand, title, channel3_offer_domains, hit } = args;

  const prompt = `You are verifying product identity for a review-attribution pipeline.

ORIGINAL PRODUCT (the only one whose reviews are useful):
  Brand: ${brand ?? "(unknown)"}
  Title: ${title}
  Sold on (canonical merchant domains): ${channel3_offer_domains.join(", ") || "(unknown)"}

CANDIDATE RESULT TO VERIFY:
  URL: ${hit.url}
  Page title: ${hit.title}
  Snippet: ${hit.snippet.slice(0, 800)}

Question: Is this candidate page almost certainly about the SAME EXACT product (same brand, same product line)?

Strict rules:
- Different brand → no match.
- Same brand but different product → no match.
- "Best X" listicles, "dupe of X", or comparison articles where multiple products are reviewed equally → no match (unless the article is clearly dominated by THE product).
- Different size/variant of the same product → MATCH (reviews usually apply across variants).
- Older or reformulated versions with the same name → MATCH with confidence: "medium" (reviews may be partially stale).
- Manufacturer's own page → MATCH but confidence: "medium" (vendor reviews can be cherry-picked).

Return ONLY a JSON object with this shape (no code fences, no prose):
{"match": boolean, "confidence": "high" | "medium" | "low", "reason": "one short sentence"}`;

  const completion = await client().chat.completions.create({
    model: VERIFY_MODEL,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0,
  });

  const raw = completion.choices[0].message.content ?? "{}";
  return VerifyDecisionSchema.parse(JSON.parse(raw));
}
