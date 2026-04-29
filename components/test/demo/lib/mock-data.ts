import type {
  ActiveGift,
  AmazonProduct,
  Brand,
  Creator,
  Match,
  MatchRow,
  Offer,
  Product,
  ProductSummary,
  RufusResponse,
} from './types'

// ---- IMAGE URLS (Unsplash, used via plain <img> since next.config has
// images.unoptimized = true). Width-capped to keep payloads small.
const SHAMPOO_IMG =
  'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&q=80'
const COFFEE_IMG =
  'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&q=80'
const SERUM_IMG =
  'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400&q=80'
const SCALPRX_IMG =
  'https://images.unsplash.com/photo-1585870683024-65f1de15a86a?w=400&q=80'
const DERMAKLEAR_IMG =
  'https://images.unsplash.com/photo-1599751449128-eb7249c3d6b1?w=400&q=80'
const HS_IMG =
  'https://images.unsplash.com/photo-1611080541599-8c6dbde6ed28?w=400&q=80'
const NIZORAL_IMG =
  'https://images.unsplash.com/photo-1626015414503-95da42a04ee6?w=400&q=80'
const TGEL_IMG =
  'https://images.unsplash.com/photo-1626808642875-0aa545482dfb?w=400&q=80'

const AVATAR = (seed: string) =>
  `https://i.pravatar.cc/120?u=${encodeURIComponent(seed)}`

// ---- BRAND
export const BRAND: Brand = {
  id: 'lumina-pro',
  name: 'Lumina Pro Dandruff Care',
  founded: 2024,
  category: 'DTC',
  segment: 'Personal care',
  logoUrl:
    'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=120&q=80',
}

export const PRODUCT: Product = {
  id: 'lumina-pro-stress-defense',
  brandId: BRAND.id,
  name: 'Lumina Pro Stress-Defense Shampoo',
  tagline: 'Clinically-formulated for stress-induced flare-ups',
  imageUrl: SHAMPOO_IMG,
  retailPriceUsd: 28,
  ingredients: ['zinc pyrithione 1%', 'salicylic acid 2%', 'niacinamide'],
  commissionPct: 15,
  status: 'Active — accepting matches',
}

// ---- CREATORS (suggested pool, exactly per spec)
export const SUGGESTED_CREATORS: Creator[] = [
  {
    id: 'samanthaskin',
    handle: '@samanthaskin',
    displayName: 'Samantha Lee',
    followers: 12_400,
    followersLabel: '12.4k',
    city: 'NYC',
    niche: 'skincare/wellness',
    avatarUrl: AVATAR('samanthaskin'),
    fitScore: 94,
    reasons: [
      {
        short:
          '61% audience overlap with your buyer profile (women 25–34, urban, skincare-engaged)',
        long:
          'Her audience matches your Stress-Defense buyer profile almost exactly: women 25–34, urban, skincare-engaged. Cross-referenced against the cohort of customers who buy zinc-pyrithione products at the $25+ price point, audience overlap lands at 61% — the highest in our suggested pool for this product.',
      },
      {
        short: 'Posted 4 scalp/dandruff content pieces in last 90 days',
        long:
          'Four scalp- or dandruff-specific posts in the last 90 days, all organic (no brand tags). Topical relevance is unusually high — this isn\'t a creator we\'d be introducing to the category, the category is already part of her content rotation.',
      },
      {
        short: 'Avg engagement on personal-care reviews: 6.2%',
        long:
          'Engagement on personal-care reviews specifically averages 6.2% — well above the 2.8% baseline for skincare creators in her audience-size band. Her followers actively comment on routine and ingredient questions, which is the signal we look for when matching ingredient-led products.',
      },
    ],
  },
  {
    id: 'thedermdiaries',
    handle: '@thedermdiaries',
    displayName: 'Priya Raman',
    followers: 8_700,
    followersLabel: '8.7k',
    city: 'LA',
    niche: 'skincare science',
    avatarUrl: AVATAR('thedermdiaries'),
    fitScore: 89,
    reasons: [
      {
        short:
          'Background in dermatology; audience indexes high on ingredient-led purchases',
        long:
          'Priya is a third-year dermatology resident; her audience self-selected for ingredient-led content. Audience indexes 2.4× the platform average on ingredient-led purchase decisions, which makes her a strong fit for a product whose claim is built on the active ingredients.',
      },
      {
        short: 'Mentioned dandruff or seborrheic dermatitis in 7 posts this year',
        long:
          'Seven posts year-to-date have explicitly addressed dandruff or seborrheic dermatitis, including a long-form explainer on zinc pyrithione mechanism that performed in her top 10% of content for the year.',
      },
      {
        short: '78% of recent reviews resulted in viewer-reported purchases',
        long:
          'Of her last 14 product reviews, 78% generated trackable viewer-reported purchases through her affiliate links. Her audience trusts her reviews enough to act on them — a signal that compounds for ingredient-led products like Stress-Defense.',
      },
    ],
  },
  {
    id: 'curlyandflaky',
    handle: '@curlyandflaky',
    displayName: 'Maya Thompson',
    followers: 23_000,
    followersLabel: '23k',
    city: 'Toronto',
    niche: 'hair/scalp care',
    avatarUrl: AVATAR('curlyandflaky'),
    fitScore: 87,
    reasons: [
      {
        short: 'Niche specifically on scalp issues; audience highly intent-driven',
        long:
          'Her entire content focus is scalp issues — flakes, itch, sensitivity, build-up. Her audience didn\'t arrive there casually; they followed her because they\'re actively shopping in this category. Intent is unusually high.',
      },
      {
        short: 'Audience size at upper edge of your targeting (under 25k)',
        long:
          '23k followers — at the upper edge of the under-25k window we recommend for first-time partner brands. Below that ceiling, audience-creator trust signals stay strong; above it, conversion rates start to drift.',
      },
      {
        short: 'Engagement rate 7.1% on hair-product reviews',
        long:
          'Hair-product reviews specifically run at 7.1% engagement — comments, saves, and shares all above her overall baseline. She doesn\'t treat reviews as brand placements; they\'re treated by her audience as recommendations from a friend.',
      },
    ],
  },
  {
    id: 'hairsciencegirl',
    handle: '@hairsciencegirl',
    displayName: 'Elena Park',
    followers: 15_200,
    followersLabel: '15.2k',
    city: 'Chicago',
    niche: 'hair science explainers',
    avatarUrl: AVATAR('hairsciencegirl'),
    fitScore: 83,
    reasons: [
      {
        short: 'Educational format suits your ingredient-led positioning',
        long:
          'Elena\'s format is whiteboard-style educational explainers with an emphasis on mechanism. Stress-Defense\'s ingredient story (zinc pyrithione + salicylic acid + niacinamide) lends itself to this format much more cleanly than a routine-integration creator would handle.',
      },
      {
        short: 'Recent video on zinc pyrithione has 89k views',
        long:
          'Her zinc-pyrithione explainer from 6 weeks ago is at 89k views — already a top-decile post for her account. Audience interest in this active is demonstrably warm, and the brand fits the educational thread she\'s already pulling on.',
      },
      {
        short: 'Audience trusts science-led claims (low purchase friction)',
        long:
          'Her audience surveys consistently low for "I need to research more before buying" friction in the science-led-creator cohort. Once she signals a recommendation, the audience moves to action faster than average.',
      },
    ],
  },
  {
    id: 'minimalskinroutine',
    handle: '@minimalskinroutine',
    displayName: 'Jordan Davis',
    followers: 6_800,
    followersLabel: '6.8k',
    city: 'SF',
    niche: 'minimalist skincare',
    avatarUrl: AVATAR('minimalskinroutine'),
    fitScore: 76,
    reasons: [
      {
        short: 'Smaller audience but very high engagement (8.4%)',
        long:
          '6.8k followers is small, but engagement runs at 8.4% — the highest in this suggested pool. Smaller, tighter audiences with this engagement profile often produce conversion rates that out-punch creators 5× their size.',
      },
      {
        short: 'Audience demographic aligns (urban, 28–38)',
        long:
          'Audience skews 28–38 and concentrates in San Francisco, Brooklyn, and Austin — high-overlap markets for your buyer cohort. The age range trends slightly older than @samanthaskin, which is useful for diversification.',
      },
      {
        short: 'Has not posted hair-product content before — audience may be receptive to expansion',
        long:
          'A first-time category for her, which cuts both ways: less proven audience interest in hair, but also no risk of fatigue from over-posting hair products. Worth testing precisely because the audience hasn\'t heard a hair recommendation from her yet.',
      },
    ],
  },
]

// ---- IN-PROGRESS MATCHES (3 cards on the brand portal)
export const IN_PROGRESS_MATCHES: Match[] = [
  {
    id: 'match-samanthaskin',
    creatorId: 'samanthaskin',
    productId: PRODUCT.id,
    stage: 'awaiting-reaction',
    stageLabel: 'Delivered (2 days ago) — Awaiting creator reaction',
    detail: 'Tracking confirms delivery to Manhattan address.',
  },
  {
    id: 'match-thedermdiaries',
    creatorId: 'thedermdiaries',
    productId: PRODUCT.id,
    stage: 'shipped',
    stageLabel: 'Shipped — In transit, expected Tuesday',
    detail: 'Carrier: UPS · Last scan: Reno, NV',
  },
  {
    id: 'match-curlyandflaky',
    creatorId: 'curlyandflaky',
    productId: PRODUCT.id,
    stage: 'approved',
    stageLabel: 'Approved — Pending shipment',
    detail: 'Awaiting fulfillment label generation.',
  },
]

// ---- CREATOR PORTAL — current creator + inbox + active gift
export const CURRENT_CREATOR: Creator = SUGGESTED_CREATORS[0]

export const INBOX_OFFERS: Offer[] = [
  {
    id: 'offer-lumina-pro',
    brandName: 'Lumina Pro Dandruff Care',
    brandLogoUrl: BRAND.logoUrl,
    productName: 'Lumina Pro Stress-Defense Shampoo',
    productImageUrl: SHAMPOO_IMG,
    commissionPct: 15,
    whyMatched:
      "We matched you because your audience indexes high on personal-care content and you've posted about scalp health four times in the last 90 days.",
  },
  {
    id: 'offer-northbean',
    brandName: 'NorthBean Coffee Co.',
    brandLogoUrl:
      'https://images.unsplash.com/photo-1497515114629-f71d768fd07c?w=120&q=80',
    productName: 'Single-origin Ethiopian',
    productImageUrl: COFFEE_IMG,
    commissionPct: 12,
    whyMatched:
      'Your morning-routine content reaches an audience that overlaps strongly with our specialty-coffee buyer profile.',
  },
  {
    id: 'offer-verdant',
    brandName: 'Verdant Skincare',
    brandLogoUrl:
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=120&q=80',
    productName: 'Niacinamide serum',
    productImageUrl: SERUM_IMG,
    commissionPct: 18,
    whyMatched:
      "You've engaged consistently with ingredient-led skincare content; this fits the discussion you started two weeks ago about minimalist routines.",
  },
]

export const ACTIVE_GIFT: ActiveGift = {
  id: 'gift-lumina-pro',
  brandName: 'Lumina Pro Dandruff Care',
  productName: 'Lumina Pro Stress-Defense Shampoo',
  productImageUrl: SHAMPOO_IMG,
  status: 'delivered',
  deliveredDaysAgo: 2,
}

export const DECLINE_REASONS = [
  "Didn't work for my hair type",
  "Didn't see results in time tested",
  'Fragrance/scent',
  'Packaging or formulation issue',
  'Caused irritation or made it worse',
  'Not a fit for my audience',
  'Other (free text)',
] as const

// ---- DATA VIEW — 12 match-row outcomes
export const MATCH_ROWS: MatchRow[] = [
  {
    id: 'r-09-12',
    date: '09/12',
    brand: 'Lumina Pro',
    product: 'Stress-Defense Shampoo',
    creatorHandle: '@samanthaskin',
    audienceLabel: '12.4k',
    fitScore: 94,
    outcome: 'posted-positive',
    detail: '8.2k views · "Actually worked for stress flares" · 47 affiliate clicks',
    postUrl: 'https://instagram.com/p/demo-samanthaskin',
  },
  {
    id: 'r-09-14',
    date: '09/14',
    brand: 'Lumina Pro',
    product: 'Stress-Defense Shampoo',
    creatorHandle: '@thedermdiaries',
    audienceLabel: '8.7k',
    fitScore: 89,
    outcome: 'posted-positive',
    detail: '5.1k views · "Ingredient list checks out" · 31 clicks',
    postUrl: 'https://instagram.com/p/demo-thedermdiaries',
  },
  {
    id: 'r-09-15',
    date: '09/15',
    brand: 'Lumina Pro',
    product: 'Stress-Defense Shampoo',
    creatorHandle: '@curlyandflaky',
    audienceLabel: '23k',
    fitScore: 87,
    outcome: 'posted-with-caveats',
    detail: '14k views · "Worked but smell isn\'t for me"',
    postUrl: 'https://instagram.com/p/demo-curlyandflaky',
  },
  {
    id: 'r-09-18',
    date: '09/18',
    brand: 'Lumina Pro',
    product: 'Stress-Defense Shampoo',
    creatorHandle: '@hairsciencegirl',
    audienceLabel: '15.2k',
    fitScore: 83,
    outcome: 'posted-positive',
    detail: '22k views · Educational explainer on zinc pyrithione',
    postUrl: 'https://instagram.com/p/demo-hairsciencegirl',
  },
  {
    id: 'r-09-19',
    date: '09/19',
    brand: 'Lumina Pro',
    product: 'Stress-Defense Shampoo',
    creatorHandle: '@minimalskinroutine',
    audienceLabel: '6.8k',
    fitScore: 76,
    outcome: 'accepted-no-post',
    detail: 'Tried for 3 weeks, didn\'t see enough difference to recommend',
  },
  {
    id: 'r-09-22',
    date: '09/22',
    brand: 'Lumina Pro',
    product: 'Stress-Defense Shampoo',
    creatorHandle: '@scalpscience',
    audienceLabel: '9.4k',
    fitScore: 81,
    outcome: 'posted-positive',
    detail: '6.7k views · "Most effective stress-flare product I\'ve tried"',
    postUrl: 'https://instagram.com/p/demo-scalpscience',
  },
  {
    id: 'r-09-23',
    date: '09/23',
    brand: 'Lumina Pro',
    product: 'Stress-Defense Shampoo',
    creatorHandle: '@hairlabgirl',
    audienceLabel: '17k',
    fitScore: 79,
    outcome: 'posted-positive',
    detail: '11k views · A/B with previous shampoo',
    postUrl: 'https://instagram.com/p/demo-hairlabgirl',
  },
  {
    id: 'r-09-24',
    date: '09/24',
    brand: 'Lumina Pro',
    product: 'Stress-Defense Shampoo',
    creatorHandle: '@glowyhairdiaries',
    audienceLabel: '4.2k',
    fitScore: 71,
    outcome: 'declined-at-offer',
    detail: 'Already promoting a competing brand this month',
  },
  {
    id: 'r-09-25',
    date: '09/25',
    brand: 'Lumina Pro',
    product: 'Stress-Defense Shampoo',
    creatorHandle: '@rootsandstrands',
    audienceLabel: '28k',
    fitScore: 73,
    outcome: 'posted-with-caveats',
    detail: '19k views · "Helped, but I needed two bottles to see results"',
    postUrl: 'https://instagram.com/p/demo-rootsandstrands',
  },
  {
    id: 'r-09-26',
    date: '09/26',
    brand: 'Lumina Pro',
    product: 'Stress-Defense Shampoo',
    creatorHandle: '@scalprx_journey',
    audienceLabel: '11k',
    fitScore: 78,
    outcome: 'accepted-no-post',
    detail: 'Caused mild irritation on day 4 — stopped using',
  },
  {
    id: 'r-09-28',
    date: '09/28',
    brand: 'Lumina Pro',
    product: 'Stress-Defense Shampoo',
    creatorHandle: '@cleanhaircollective',
    audienceLabel: '8.1k',
    fitScore: 84,
    outcome: 'posted-positive',
    detail: '6.3k views · Routine integration video',
    postUrl: 'https://instagram.com/p/demo-cleanhaircollective',
  },
  {
    id: 'r-09-29',
    date: '09/29',
    brand: 'Lumina Pro',
    product: 'Stress-Defense Shampoo',
    creatorHandle: '@hairtruthtelling',
    audienceLabel: '5.9k',
    fitScore: 69,
    outcome: 'declined-at-offer',
    detail: "Don't take dandruff brands — out of audience scope",
  },
]

// ---- PRODUCT SUMMARY (3 competing dandruff products)
export const PRODUCT_SUMMARY: ProductSummary[] = [
  {
    id: 'lumina-pro',
    name: 'Lumina Pro Stress-Defense',
    isFeatured: true,
    postRate: 0.81,
    postCountText: '38 of 47 creators',
    avgSentiment: 4.6,
    conversionPct: 5.2,
    topThemeLabel: 'TOP THEME',
    topThemeQuote: 'actually worked for stress flares',
  },
  {
    id: 'scalprx',
    name: 'ScalpRX (competitor)',
    isFeatured: false,
    postRate: 0.27,
    postCountText: '12 of 45 creators',
    avgSentiment: 3.2,
    conversionPct: 1.8,
    topThemeLabel: 'TOP DECLINE REASON',
    topThemeQuote: 'no visible change after 3 weeks',
  },
  {
    id: 'dermaklear',
    name: 'DermaKlear (competitor)',
    isFeatured: false,
    postRate: 0.075,
    postCountText: '3 of 40 creators',
    avgSentiment: 2.1,
    conversionPct: 0.6,
    topThemeLabel: 'TOP DECLINE REASON',
    topThemeQuote: 'made my scalp worse',
  },
]

// ---- AMAZON PRODUCTS (6 cards, ids A–F per spec)
export const AMAZON_PRODUCTS: AmazonProduct[] = [
  {
    id: 'A',
    title: 'ScalpRX Anti-Dandruff Shampoo',
    imageUrl: SCALPRX_IMG,
    rating: 4.3,
    reviewCount: 12_847,
    priceUsd: 14.99,
    prime: true,
    sponsored: true,
  },
  {
    id: 'B',
    title: 'DermaKlear Medicated Shampoo',
    imageUrl: DERMAKLEAR_IMG,
    rating: 4.1,
    reviewCount: 8_232,
    priceUsd: 11.5,
    prime: true,
  },
  {
    id: 'C',
    title: 'Lumina Pro Stress-Defense Shampoo',
    imageUrl: SHAMPOO_IMG,
    rating: 4.6,
    reviewCount: 412,
    priceUsd: 28.0,
    prime: true,
    isFeatured: true,
  },
  {
    id: 'D',
    title: 'Head & Shoulders Classic Clean',
    imageUrl: HS_IMG,
    rating: 4.5,
    reviewCount: 47_109,
    priceUsd: 8.97,
    prime: true,
  },
  {
    id: 'E',
    title: 'Nizoral A-D Anti-Dandruff',
    imageUrl: NIZORAL_IMG,
    rating: 4.4,
    reviewCount: 24_300,
    priceUsd: 14.27,
    prime: true,
  },
  {
    id: 'F',
    title: 'T/Gel Therapeutic',
    imageUrl: TGEL_IMG,
    rating: 4.3,
    reviewCount: 9_840,
    priceUsd: 11.2,
    prime: true,
  },
]

// Product grid orders for the two Rufus states
export const ORDER_WITHOUT_GIFTLY: string[] = ['A', 'D', 'E', 'B', 'F', 'C']
export const ORDER_WITH_GIFTLY: string[] = ['C', 'A', 'E', 'D', 'B', 'F']

// ---- RUFUS THREADS
export const RUFUS_WITHOUT_GIFTLY: RufusResponse = {
  thread: [
    {
      speaker: 'user',
      text: 'best dandruff shampoo for stress flare-ups',
    },
    {
      speaker: 'rufus',
      text: 'Based on Amazon customer reviews and bestseller data, here are the top picks:',
      bullets: [
        {
          title: 'ScalpRX Anti-Dandruff Shampoo',
          body: '4.3★ with over 12,000 reviews. Many customers report relief from itchy, flaky scalp.',
        },
        {
          title: 'Head & Shoulders Classic Clean',
          body: 'A trusted bestseller with 4.5★ from 47,000+ reviews.',
        },
        {
          title: 'Nizoral A-D',
          body: 'Contains ketoconazole; 4.4★ from over 24,000 customers.',
        },
      ],
      reviewQuote:
        'Amazing!!! Best shampoo ever, fixed my dandruff in one wash, 5 stars!!!',
    },
  ],
}

export const RUFUS_WITH_GIFTLY: RufusResponse = {
  thread: [
    {
      speaker: 'user',
      text: 'best dandruff shampoo for stress flare-ups',
    },
    {
      speaker: 'rufus',
      text:
        "Looking at how real people respond when they're not being paid to post:",
      bullets: [
        {
          title: 'Lumina Pro Stress-Defense Shampoo',
          body:
            'Stands out clearly — 81% of creators who received it without any obligation to post chose to post about it organically, and the most common feedback specifically mentioned stress-induced flare-ups, which matches your situation.',
        },
        {
          title: 'ScalpRX',
          body:
            'Has more Amazon reviews, but only 27% of unpaid creators chose to post about it, and the most common reason for not posting was "no visible change after 3 weeks."',
        },
      ],
      recommendation: {
        product: 'Lumina Pro Stress-Defense Shampoo',
        priceUsd: 28,
        rationale:
          'Based on independent, unpaid evaluation rather than ad-incentivized reviews.',
      },
    },
  ],
}
