import OpenAI from "openai";
import { ReviewSummarySchema, type ReviewSummary } from "./types";
import type { ReviewSearchHit } from "./tavily";

let _openai: OpenAI | null = null;
function client(): OpenAI {
  if (!_openai) _openai = new OpenAI();
  return _openai;
}

export async function summarizeReviews(args: {
  brand: string | null;
  title: string;
  verified_hits: ReviewSearchHit[];
}): Promise<ReviewSummary> {
  const { brand, title, verified_hits } = args;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  // Concatenate the actually-relevant content from each verified hit. Prefer
  // raw_content (full extracted page) when available; fall back to snippet.
  // Cap each block so we don't blow the context window when a page is huge.
  const reviewBlocks = verified_hits
    .map((h, i) => {
      const body = (h.raw_content ?? h.snippet).slice(0, 4000);
      return `--- Source ${i + 1}: ${h.domain} (${h.url}) ---\n${body}`;
    })
    .join("\n\n");

  const prompt = `You are summarizing customer reviews of a single product.

PRODUCT:
  Brand: ${brand ?? "(unknown)"}
  Title: ${title}

REVIEW SOURCES (already verified to be about the right product):
${reviewBlocks}

Your job: produce a STRUCTURED SUMMARY that captures the full distribution of opinions, not just the headline rating. Real customer language. The long tail matters as much as the headline.

Return ONLY a JSON object (no code fences, no prose) with this exact shape:
{
  "common_praise": [string, ...],         // 3-7 positive points that appear in MULTIPLE reviews
  "common_complaints": [string, ...],     // 3-7 negative points that appear in MULTIPLE reviews
  "edge_cases": [string, ...],            // unusual but real reactions (e.g. "irritates very sensitive skin", "battery dies in cold weather")
  "use_cases": [string, ...],             // who/when this works well for ("great for travel", "best for fine hair", "ideal for small spaces")
  "approximate_rating": number | null,    // 1.0-5.0 if you can infer a typical rating, else null
  "review_count_seen": number,            // approximate count across all sources
  "sources": [string, ...],               // domains the reviews came from (e.g. "amazon.com")
  "confidence": "high" | "medium" | "low" // high = many reviews + multiple sources; low = <5 reviews or single source
}

Be specific in praise/complaints. "Quality is great" is useless; "lasts 8+ hours on a charge" is useful. Write in the voice of a synthesized reviewer, not a marketing summary.`;

  const completion = await client().chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const raw = completion.choices[0].message.content ?? "{}";
  return ReviewSummarySchema.parse(JSON.parse(raw));
}

// Flat-text version of the summary — what we embed. Includes brand and title
// at the top so the embedding has product identity as well as the review
// signal.
export function summaryToEmbedText(args: {
  brand: string | null;
  title: string;
  summary: ReviewSummary;
}): string {
  const { brand, title, summary } = args;
  return [
    `Product: ${brand ?? ""} ${title}`.trim(),
    `Approximate rating: ${summary.approximate_rating ?? "unknown"}`,
    `Use cases: ${summary.use_cases.join(", ")}`,
    `Common praise: ${summary.common_praise.join("; ")}`,
    `Common complaints: ${summary.common_complaints.join("; ")}`,
    `Edge cases: ${summary.edge_cases.join("; ")}`,
  ]
    .filter(Boolean)
    .join("\n");
}
