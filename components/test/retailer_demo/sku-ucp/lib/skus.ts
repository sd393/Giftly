// Featured SKU: Innersense Organic Beauty — Color Awakening Hairbath, 10 oz
// (sourced from grove.co; product page screenshot in
//  ~/Desktop/Miscellaneous/Screenshots/ucp_ex_1.png and ucp_ex_2.png).
//
// Synthetic SKU id, GTIN, MPN, and Giftly attestation data — plausible but
// not actual catalog values. Add additional SKUs to the array below; the
// page renders whichever the user picks.
//
// JSON output mirrors the Universal Commerce Protocol catalog spec at
// version 2026-04-08 — see https://ucp.dev/2026-04-08/specification/catalog/mcp/

import type { Sku, UcpView } from './types'

export const UCP_SPEC_VERSION = '2026-04-08'

export const SKUS: Sku[] = [
  {
    id: 'grove_collaborative/innersense-cah-10oz',
    handle: 'innersense-color-awakening-hairbath-10oz',
    brand: 'Innersense Organic Beauty',
    name: 'Color Awakening Hairbath',
    size: '10 oz',
    rating: 4.8,
    reviewCount: 5,
    priceCents: 3000,
    imageSrc: '/retailer-demo/innersense-product.png',
    imageUrl:
      'https://grove.co/cdn/innersense/color-awakening-hairbath-10oz.jpg',
    productUrl:
      'https://grove.co/catalog/innersense/color-awakening-hairbath-10oz',
    description:
      'Revitalize color treated hair with this color safe and gentle shampoo. Crafted with coconut and pumpkin seed oils, shea butter and other emollient plant ingredients that enhance and protect color, delivering naturally healthy and vibrant hair — without residue, dryness or fading.',
    whyWeLoveIt: [
      'Free from 3,000+ banned ingredients and meets our EU-informed standards.',
      'Contains Certified Organic Ingredients for a more sustainable and natural haircare routine.',
      'Specifically formulated for medium texture, color, or chemically treated hair.',
      'Embraces a mission-aligned approach to providing quality hair products for all hair types.',
    ],
    groveValues: [
      '1% for the Planet',
      '100% Natural Fragrance',
      '≥ 50% PCR Content',
      'B Corporation',
      'Certified Cruelty Free',
      'cGMP Certified',
      'Charitable Giveback',
      'Climate Partner Certification',
      'Vegetarian',
    ],
    category: 'Health & Beauty > Personal Care > Hair Care > Shampoo',
    sku: 'INS-CAH-10',
    freeShippingThreshold: 25,
    subscribeRewardRate: 0.15,
    buyOnceRewardRate: 0.01,
    tags: [
      'shampoo',
      'color-treated-hair',
      'medium-texture',
      'sulfate-free',
      'silicone-free',
      'vegan',
      'leaping-bunny',
      'b-corp',
      'cruelty-free',
      'organic-ingredients',
    ],
    nativeCommerce: true,
    merchantItemId: 'GROVE-INS-CAH-10',
    consumerNotice: {
      type: 'legal_disclaimer',
      message:
        'For external use only. Avoid contact with eyes. If irritation occurs, discontinue use.',
    },
    returnPolicyLabel: 'grove-standard-30d',
    giftly: {
      schema_version: '1.0',
      attached_to: 'variant',
      seller_domain: 'grove.co',
      signal_score: 0.91,
      signal_decile: 'top decile, haircare/shampoo',
      attestation_count: 24,
      unique_creators: 9,
      top_use_cases: [
        'color-treated hair',
        'medium texture',
        'sensitive scalp',
      ],
      verdict_distribution: { preferred: 21, neutral: 3, rejected: 0 },
      evidence_completeness: 0.84,
      last_attestation_received: '2026-04-22T18:14:00Z',
      sample_attestations: [
        {
          creator_id: 'creator_a47b',
          creator_authority: 0.87,
          use_duration_days: 21,
          verdict: 'preferred',
          tagged_use_cases: ['color-treated hair', 'sensitive scalp'],
          evidence: {
            before_after_photos: 6,
            video_demonstration: true,
            ingredient_review: true,
            comparative_test: false,
          },
          note: 'Maintained color vibrancy across 3 weeks of use; no scalp irritation despite known sensitivity.',
        },
        {
          creator_id: 'creator_c12e',
          creator_authority: 0.84,
          use_duration_days: 18,
          verdict: 'preferred',
          tagged_use_cases: ['medium texture', 'volume retention'],
          evidence: {
            before_after_photos: 4,
            video_demonstration: true,
            ingredient_review: false,
            comparative_test: true,
          },
          note: 'Significantly less hair fall vs prior shampoo; medium texture held volume after blow-dry.',
        },
        {
          creator_id: 'creator_d09f',
          creator_authority: 0.79,
          use_duration_days: 14,
          verdict: 'preferred',
          tagged_use_cases: ['color-treated hair'],
          evidence: {
            before_after_photos: 2,
            video_demonstration: false,
            ingredient_review: true,
            comparative_test: true,
          },
          note: 'Head-to-head against a competitor brand; preferred this one for clarity without stripping.',
        },
      ],
    },
  },
]

// Build a UCP catalog product object (spec 2026-04-08).
//
// Key fidelity points to the UCP spec:
//  - prices live in `{ amount, currency }` with `amount` in MINOR UNITS
//    (cents). $30.00 → { amount: 3000, currency: 'USD' }.
//  - `description` is an object with named formats (`plain`), not a bare
//    string.
//  - `categories` are objects with `value` + `taxonomy` (we cite Google's
//    product taxonomy).
//  - `rating` is `{ value, scale_max, count }`, not schema.org's
//    `aggregateRating`.
//  - `variants` is required and carries `seller`, price, availability,
//    options, sku, tags, and metadata. Grove is the seller on this
//    variant; the brand (Innersense) is *not* the seller.
//  - `customAttributes` on the variant mirrors the Google Merchant API
//    shape (`name` + either `value` or `groupValues`). This is where
//    UCP-eligibility flags live: `native_commerce` opts the listing
//    into agentic checkout, `consumer_notice` carries regulatory
//    warnings (Prop 65, legal disclaimers, safety warnings), and
//    `merchant_item_id` bridges Google's product id to Grove's
//    internal checkout-API id.
//  - Giftly enrichment attaches at `variants[].metadata` under the
//    reverse-domain key `"co.giftly.preference_signals"` — UCP's
//    spec-blessed extensibility surface. Lives on the variant (the
//    seller's listing) so a different retailer's variant of the same
//    product would not inherit it.
export function buildUcp(sku: Sku, view: UcpView): Record<string, unknown> {
  const variantId = `${sku.id}/v1`

  const variantMetadata: Record<string, unknown> = {
    'grove.merchandising': {
      subscription_offer: {
        reward_rate: sku.subscribeRewardRate,
        interval: 'P1M',
        description: 'Earn rewards on every shipment. Cancel anytime.',
      },
      buy_once_reward_rate: sku.buyOnceRewardRate,
      free_shipping_threshold: {
        amount: sku.freeShippingThreshold * 100,
        currency: 'USD',
      },
    },
  }

  if (view === 'enriched') {
    variantMetadata['co.giftly.preference_signals'] = sku.giftly
  }

  const productMetadata = {
    'grove.values': sku.groveValues,
    'grove.editorial': {
      why_we_love_it: sku.whyWeLoveIt,
    },
  }

  const variant: Record<string, unknown> = {
    id: variantId,
    sku: sku.sku,
    title: `${sku.name} — ${sku.size}`,
    description: {
      plain: `${sku.size} bottle of ${sku.name} by ${sku.brand}.`,
    },
    price: { amount: sku.priceCents, currency: 'USD' },
    availability: { available: true },
    options: [{ name: 'Size', label: sku.size }],
    tags: sku.tags,
    seller: {
      name: 'Grove Collaborative',
      links: [
        { rel: 'homepage', href: 'https://grove.co' },
        { rel: 'product_page', href: sku.productUrl },
      ],
    },
    native_commerce: sku.nativeCommerce,
    merchant_item_id: sku.merchantItemId,
    return_policy_label: sku.returnPolicyLabel,
    metadata: variantMetadata,
  }

  if (sku.consumerNotice) {
    variant.consumer_notice = {
      type: sku.consumerNotice.type,
      message: sku.consumerNotice.message,
    }
  }

  return {
    id: sku.id,
    handle: sku.handle,
    title: sku.name,
    description: { plain: sku.description },
    url: sku.productUrl,
    categories: [
      { value: sku.category, taxonomy: 'google.product_taxonomy' },
    ],
    price_range: {
      min: { amount: sku.priceCents, currency: 'USD' },
      max: { amount: sku.priceCents, currency: 'USD' },
    },
    media: [
      {
        type: 'image',
        url: sku.imageUrl,
        alt_text: `${sku.brand} ${sku.name}, ${sku.size}`,
      },
    ],
    options: [{ name: 'Size', values: [sku.size] }],
    rating: {
      value: sku.rating,
      scale_max: 5,
      count: sku.reviewCount,
    },
    tags: sku.tags,
    variants: [variant],
    metadata: productMetadata,
  }
}
