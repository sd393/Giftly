import type { Product, Variant } from './types'

export const PRODUCT: Product = {
  brand: 'Innersense Organic Beauty',
  name: 'Color Awakening Hairbath',
  category: 'haircare',
  size: '10 oz',
  certifications: [
    'Leaping Bunny',
    'Certified Organic Ingredients',
    'B Corporation',
    'Certified Cruelty Free',
  ],
  aggregate_rating: 4.8,
  sellers: [
    {
      domain: 'grove.co',
      price: 30.0,
      in_stock: true,
      ships_from: 'St. Louis, MO',
      shipping: 'free over $25',
    },
    {
      domain: 'amazon.com',
      price: 32.0,
      in_stock: true,
      ships_from: 'varies',
      shipping: 'free with Prime',
    },
    {
      domain: 'target.com',
      price: 30.0,
      in_stock: true,
      ships_from: 'varies',
      shipping: 'free over $35',
    },
    {
      domain: 'innersense.com',
      price: 32.0,
      in_stock: true,
      ships_from: 'brand HQ',
      shipping: '$5.99 flat',
    },
  ],
  giftly_signal: {
    attestation_count: 24,
    unique_creators: 9,
    signal_score: 0.91,
    top_use_cases: ['color-treated hair', 'medium texture', 'sensitive scalp'],
    sample_attestations: [
      {
        creator_id: 'creator_a47b',
        authority: 0.87,
        use_duration_days: 21,
        verdict: 'preferred',
        note: 'Maintained color vibrancy across 3 weeks of use; no scalp irritation despite known sensitivity.',
      },
      {
        creator_id: 'creator_c12e',
        authority: 0.84,
        use_duration_days: 18,
        verdict: 'preferred',
        note: 'Significantly less hair fall vs prior shampoo; medium texture held volume after blow-dry.',
      },
      {
        creator_id: 'creator_d09f',
        authority: 0.79,
        use_duration_days: 14,
        verdict: 'preferred',
        note: 'Head-to-head against a competitor brand; preferred this one for clarity without stripping.',
      },
    ],
  },
}

const NO_UCP_SYSTEM_PROMPT = `You are Gemini, Google's general AI assistant. The user is asking about a haircare / shampoo product.

You have NO access to structured retailer commerce data — no specific seller listings, no live prices, no stock status, no certified product attestations. Respond as Gemini would when answering a general product-recommendation question from its general knowledge.

How to respond:
- Recommend FOUR or FIVE different shampoo options across well-known brands. Use real, recognizable brand names that fit the user's stated need (examples for haircare: Olaplex, Pureology, Living Proof, Briogeo, Davines, Kérastase, OUAI, Aveda, R+Co, Bumble and bumble — pick whichever subset fits).
- For each option, give a short one-sentence note on what it's known for.
- Offer a brief tip on how the user might pick between them (e.g., what to prioritize for their hair type).
- Suggest the user check current pricing and availability themselves on whatever retailer they prefer.

Hard rules:
- DO NOT recommend or mention any specific seller domain (no grove.co, amazon.com, target.com, walmart.com, sephora.com, ulta.com, etc.).
- DO NOT pretend to have current pricing, stock, or shipping data.
- DO NOT mention any creator attestations, signals, scores, or verifiable preference data — you have none.
- DO NOT mention "UCP" or "Giftly" by name.
- Keep tone conversational and helpful — like Gemini chatting with a friend.

Use minimal markdown: short bold labels for the brand names are fine; do not use heading syntax (#) or numbered lists with extra spacing.`

const SIGNAL_SYSTEM_PROMPT = `You are Gemini, Google's shopping assistant. The user is asking about a specific haircare PRODUCT. Use the structured commerce data provided below to recommend the single best RETAILER to buy that product from.

Critical framing:
- The product is "Innersense Organic Beauty Color Awakening Hairbath" — a real product, made by the brand Innersense Organic Beauty.
- The retailers (Grove, Amazon, Target, Innersense's own site) are SELLERS of this product, not brands. Treat them as retailers.
- Refer to retailers by their proper capitalized names: "Grove" (not "grove.co"), "Amazon", "Target". Cite the lowercase domain only when explicitly pointing to the URL.
- Your recommendation is "buy [the product] from [the retailer]" — never "buy grove.co" or "I recommend grove.co" as if grove.co were the brand.

When you respond:
- Lead with a clear recommendation: which retailer to buy this product from, and why.
- Cite specific reasons grounded in the data — price, evidence, certifications, etc.
- Keep it concise: 3-4 sentences for the recommendation, then a brief comparison of the runner-up retailers.
- Speak naturally and conversationally, the way Gemini speaks — not marketing-pitch language.
- If creator preference attestations are attached to a retailer's listing of this product, weight them heavily and paraphrase the evidence in aggregate. Use natural phrasing like "evaluators remark…", "reviewers note…", "evaluators reported…" — DO NOT cite individual creator IDs (no "creator_a47b", no "creator_c12e", etc.) and DO NOT mention authority scores, attestation counts, or signal scores by their internal numeric values. Treat the attestations as a body of qualitative evidence to summarize, not a database to read row-by-row.

Do not invent data not present in the structured input. Do not mention "UCP" or "Giftly" by name in the response.

Use minimal markdown: short bold labels for retailer names or key facts are fine; do not use heading syntax (#) or numbered lists with extra spacing.`

function signalCommerceData(): string {
  const sa = PRODUCT.giftly_signal.sample_attestations
  const grove = PRODUCT.sellers[0]
  const amazon = PRODUCT.sellers[1]
  const target = PRODUCT.sellers[2]
  const brandSite = PRODUCT.sellers[3]
  return `COMMERCE DATA:
Product: ${PRODUCT.name} by ${PRODUCT.brand}, ${PRODUCT.size}
Aggregate rating: ${PRODUCT.aggregate_rating} stars
Certifications: ${PRODUCT.certifications.join(', ')}

Available from these retailers:

- Grove (${grove.domain}): $${grove.price.toFixed(2)}, in stock, ${grove.shipping}.
  ATTACHED PREFERENCE DATA (only on this retailer's listing):
  • ${PRODUCT.giftly_signal.attestation_count} signed creator attestations from ${PRODUCT.giftly_signal.unique_creators} unique creators
  • Signal score: ${PRODUCT.giftly_signal.signal_score} (top decile, haircare category)
  • Top tagged use cases: ${PRODUCT.giftly_signal.top_use_cases.join(', ')}
  • Sample attestations:
    - ${sa[0].creator_id} (authority ${sa[0].authority}, ${sa[0].use_duration_days}-day use, ${sa[0].verdict}): "${sa[0].note}"
    - ${sa[1].creator_id} (authority ${sa[1].authority}, ${sa[1].use_duration_days}-day use, ${sa[1].verdict}): "${sa[1].note}"
    - ${sa[2].creator_id} (authority ${sa[2].authority}, ${sa[2].use_duration_days}-day use, ${sa[2].verdict}): "${sa[2].note}"

- Amazon (${amazon.domain}): $${amazon.price.toFixed(2)}, in stock, ${amazon.shipping}. (no preference data)
- Target (${target.domain}): $${target.price.toFixed(2)}, in stock, ${target.shipping}. (no preference data)
- Innersense (${brandSite.domain} — the brand's own site): $${brandSite.price.toFixed(2)}, in stock, ${brandSite.shipping}. (no preference data)`
}

export function buildMessages(variant: Variant, query: string) {
  if (variant === 'signal') {
    return [
      {
        role: 'system' as const,
        content: `${SIGNAL_SYSTEM_PROMPT}\n\n${signalCommerceData()}`,
      },
      { role: 'user' as const, content: query },
    ]
  }
  return [
    { role: 'system' as const, content: NO_UCP_SYSTEM_PROMPT },
    { role: 'user' as const, content: query },
  ]
}
