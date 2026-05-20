import { tavily, type TavilyClient } from "@tavily/core";

// SDK type isn't exported — inline the shape we need.
type TavilySearchResult = {
  title: string;
  url: string;
  content: string;
  rawContent?: string;
  score: number;
};

// Retailer + aggregator domains where genuine consumer reviews live. We scope
// every Tavily search to these so we never pull from random blogs / SEO spam.
// Tuned for general consumer products; works well for the queries in
// queries.txt. Add domain-specific lists later if categories need them.
export const REVIEW_DOMAINS = [
  "amazon.com",
  "bestbuy.com",
  "rei.com",
  "target.com",
  "walmart.com",
  "wirecutter.com",
  "nytimes.com", // Wirecutter lives here too
  "rtings.com",
  "consumerreports.org",
  "influenster.com",
  "reddit.com",
];

let _client: TavilyClient | null = null;

export function getTavily(): TavilyClient {
  if (_client) return _client;
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error(
      "TAVILY_API_KEY is not set. Get a key at https://tavily.com and add it to .env.",
    );
  }
  _client = tavily({ apiKey });
  return _client;
}

export type ReviewSearchHit = {
  url: string;
  title: string;
  domain: string;
  snippet: string;          // Tavily's `content` — usually the most relevant excerpt
  raw_content: string | null; // when includeRawContent succeeds, the full extracted page
  score: number;
};

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// Search retailer/aggregator domains for "<brand> <title> reviews".
// `extra` lets us widen the query on subsequent attempts if the first fails
// (e.g., add specific features for disambiguation).
export async function searchReviews(args: {
  brand: string | null;
  title: string;
  extra?: string;
  maxResults?: number;
}): Promise<ReviewSearchHit[]> {
  const { brand, title, extra, maxResults = 8 } = args;
  const queryParts = [brand, title, extra, "reviews"].filter(Boolean);
  const query = queryParts.join(" ");

  const res = await getTavily().search(query, {
    searchDepth: "advanced",
    includeDomains: REVIEW_DOMAINS,
    maxResults,
    includeRawContent: "text",
  });

  return res.results.map((r: TavilySearchResult): ReviewSearchHit => ({
    url: r.url,
    title: r.title,
    domain: domainOf(r.url),
    snippet: r.content,
    raw_content: r.rawContent ?? null,
    score: r.score,
  }));
}
