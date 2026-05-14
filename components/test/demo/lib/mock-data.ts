import type {
  ActiveGift,
  AmazonProduct,
  Brand,
  CategorySchema,
  Creator,
  FacialCue,
  Match,
  Offer,
  PerVideoExtraction,
  Product,
  ProductQualityRecord,
  ProductScorecard,
  ProductSummary,
  RufusResponse,
  TranscriptSegment,
  VisualObservation,
} from './types'

// ---- IMAGE URLS
// Bime hero assets are committed locally under /public/demo so we don't depend
// on third-party hotlinks. The heated-curler asset is reserved for Bime only —
// each competitor card uses a distinct image so the grid doesn't show duplicates.
const HEATED_CURLER_IMG = '/demo/heated-eyelash-curler.png'
const REGULAR_CURLER_IMG = '/demo/regular-eyelash-curler.jpg'
const BIME_LOGO = '/demo/bime-beauty-logo.png'

// Per-competitor real product photos, downloaded locally from each brand's
// official storefront so the grid doesn't depend on third-party hotlinks.
const TWEEZERMAN_IMG = '/demo/tweezerman-curler.jpg'
const SHISEIDO_IMG = '/demo/shiseido-curler.jpg'
const REVLON_IMG = '/demo/revlon-curler.jpg'
const GRANDELASH_IMG = '/demo/grandelash-heated-curler.jpg'
const KEVYN_AUCOIN_IMG = '/demo/kevyn-aucoin-curler.jpg'

// Brand logos for unrelated inbox-offer placeholders (NorthBean coffee, Verdant)
const COFFEE_IMG =
  'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&q=80'
const SERUM_IMG =
  'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400&q=80'

const AVATAR = (seed: string) =>
  `https://i.pravatar.cc/120?u=${encodeURIComponent(seed)}`

// ---- BRAND
export const BRAND: Brand = {
  id: 'bime-beauty',
  name: 'Bime Beauty',
  founded: 2020,
  category: 'DTC',
  segment: 'Eye beauty tools',
  logoUrl: BIME_LOGO,
}

export const PRODUCT: Product = {
  id: 'bime-heated-curler',
  brandId: BRAND.id,
  name: 'Bime Beauty Heated Eyelash Curler',
  tagline: 'Salon-grade lift in 5 seconds — no pinching, no creasing',
  imageUrl: HEATED_CURLER_IMG,
  retailPriceUsd: 49,
  // Field is named `ingredients` in the schema but repurposed here as
  // hardware/feature specs — products-tab.tsx renders it under "key features".
  ingredients: [
    'ceramic heating element',
    '30-second warm-up',
    '3 heat settings',
    'auto shut-off after 10 min',
  ],
  commissionPct: 15,
  status: 'Active — accepting matches',
}

// ---- CREATORS (suggested pool, exactly per spec)
export const SUGGESTED_CREATORS: Creator[] = [
  {
    id: 'lashlifedaily',
    handle: '@lashlifedaily',
    displayName: 'Samantha Lee',
    followers: 12_400,
    followersLabel: '12.4k',
    city: 'NYC',
    niche: 'lash & eye makeup',
    avatarUrl: AVATAR('lashlifedaily'),
    fitScore: 94,
    reasons: [
      {
        short:
          '61% audience overlap with your buyer profile (women 22–34, urban, lash-extension graduates)',
        long:
          'Her audience matches your heated-curler buyer profile almost exactly: women 22–34, urban, with high crossover into the cohort that recently churned off lash extensions and is shopping for a daily at-home alternative. Cross-referenced against the cohort that buys eye-tool products at the $40+ price point, audience overlap lands at 61% — the highest in our suggested pool for this product.',
      },
      {
        short: 'Posted 4 lash-tool / heated-curler content pieces in last 90 days',
        long:
          'Four lash-tool or heated-curler-specific posts in the last 90 days, all organic (no brand tags). Topical relevance is unusually high — this isn\'t a creator we\'d be introducing to the category, the category is already part of her content rotation.',
      },
      {
        short: 'Avg engagement on eye-tool reviews: 6.2%',
        long:
          'Engagement on eye-tool reviews specifically averages 6.2% — well above the 2.8% baseline for beauty creators in her audience-size band. Her followers actively comment on technique and tool questions, which is the signal we look for when matching hardware-led products.',
      },
    ],
  },
  {
    id: 'themuabar',
    handle: '@themuabar',
    displayName: 'Priya Raman',
    followers: 8_700,
    followersLabel: '8.7k',
    city: 'LA',
    niche: 'pro MUA / makeup science',
    avatarUrl: AVATAR('themuabar'),
    fitScore: 89,
    reasons: [
      {
        short:
          'Working pro MUA; audience indexes high on tool-led purchases',
        long:
          'Priya is a working pro makeup artist with editorial credits; her audience self-selected for tool-led content. Audience indexes 2.4× the platform average on tool-led purchase decisions, which makes her a strong fit for a product whose claim is built on the heating mechanism.',
      },
      {
        short: 'Mentioned heated curlers or lash lift in 7 posts this year',
        long:
          'Seven posts year-to-date have explicitly addressed heated curlers or at-home lash lift, including a long-form explainer on why ceramic vs metal matters for hold that performed in her top 10% of content for the year.',
      },
      {
        short: '78% of recent reviews resulted in viewer-reported purchases',
        long:
          'Of her last 14 product reviews, 78% generated trackable viewer-reported purchases through her affiliate links. Her audience trusts her reviews enough to act on them — a signal that compounds for hardware-led products like a heated curler.',
      },
    ],
  },
  {
    id: 'hoodedeyebeauty',
    handle: '@hoodedeyebeauty',
    displayName: 'Maya Thompson',
    followers: 23_000,
    followersLabel: '23k',
    city: 'Toronto',
    niche: 'hooded-eye / monolid makeup',
    avatarUrl: AVATAR('hoodedeyebeauty'),
    fitScore: 87,
    reasons: [
      {
        short: 'Niche specifically on hooded-eye lash lift; audience highly intent-driven',
        long:
          'Her entire content focus is hooded-eye and monolid lash technique — audiences who can\'t get a clean curl from a manual curler are her people. Her audience didn\'t arrive there casually; they followed her because they\'re actively shopping in this category. Intent is unusually high.',
      },
      {
        short: 'Audience size at upper edge of your targeting (under 25k)',
        long:
          '23k followers — at the upper edge of the under-25k window we recommend for first-time partner brands. Below that ceiling, audience-creator trust signals stay strong; above it, conversion rates start to drift.',
      },
      {
        short: 'Engagement rate 7.1% on lash-tool reviews',
        long:
          'Lash-tool reviews specifically run at 7.1% engagement — comments, saves, and shares all above her overall baseline. She doesn\'t treat reviews as brand placements; they\'re treated by her audience as recommendations from a friend.',
      },
    ],
  },
  {
    id: 'beautytoolnerd',
    handle: '@beautytoolnerd',
    displayName: 'Elena Park',
    followers: 15_200,
    followersLabel: '15.2k',
    city: 'Chicago',
    niche: 'beauty tool reviews & explainers',
    avatarUrl: AVATAR('beautytoolnerd'),
    fitScore: 83,
    reasons: [
      {
        short: 'Educational format suits your hardware-led positioning',
        long:
          'Elena\'s format is whiteboard-style educational explainers with an emphasis on how the tool works. Bime\'s heated-curler story (ceramic element + 3 heat settings + 30-second warm-up) lends itself to this format much more cleanly than a routine-integration creator would handle.',
      },
      {
        short: 'Recent video on heated curlers has 89k views',
        long:
          'Her heated-curler explainer from 6 weeks ago is at 89k views — already a top-decile post for her account. Audience interest in this category is demonstrably warm, and the brand fits the educational thread she\'s already pulling on.',
      },
      {
        short: 'Audience trusts mechanism-led claims (low purchase friction)',
        long:
          'Her audience surveys consistently low for "I need to research more before buying" friction in the tool-explainer cohort. Once she signals a recommendation, the audience moves to action faster than average.',
      },
    ],
  },
  {
    id: 'minimalmakeupgirl',
    handle: '@minimalmakeupgirl',
    displayName: 'Jordan Davis',
    followers: 6_800,
    followersLabel: '6.8k',
    city: 'SF',
    niche: 'minimalist makeup',
    avatarUrl: AVATAR('minimalmakeupgirl'),
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
          'Audience skews 28–38 and concentrates in San Francisco, Brooklyn, and Austin — high-overlap markets for your buyer cohort. The age range trends slightly older than @lashlifedaily, which is useful for diversification.',
      },
      {
        short: 'Has not posted lash-tool content before — audience may be receptive to expansion',
        long:
          'A first-time category for her, which cuts both ways: less proven audience interest in lash tools, but also no risk of fatigue from over-posting them. Worth testing precisely because the audience hasn\'t heard a lash-tool recommendation from her yet.',
      },
    ],
  },
]

// ---- IN-PROGRESS MATCHES (3 cards on the brand portal)
export const IN_PROGRESS_MATCHES: Match[] = [
  {
    id: 'match-lashlifedaily',
    creatorId: 'lashlifedaily',
    productId: PRODUCT.id,
    stage: 'awaiting-reaction',
    stageLabel: 'Delivered (2 days ago) — Awaiting creator reaction',
    detail: 'Tracking confirms delivery to Manhattan address.',
  },
  {
    id: 'match-themuabar',
    creatorId: 'themuabar',
    productId: PRODUCT.id,
    stage: 'shipped',
    stageLabel: 'Shipped — In transit, expected Tuesday',
    detail: 'Carrier: UPS · Last scan: Reno, NV',
  },
  {
    id: 'match-hoodedeyebeauty',
    creatorId: 'hoodedeyebeauty',
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
    id: 'offer-bime-beauty',
    brandName: 'Bime Beauty',
    brandLogoUrl: BRAND.logoUrl,
    productName: 'Bime Beauty Heated Eyelash Curler',
    productImageUrl: HEATED_CURLER_IMG,
    commissionPct: 15,
    whyMatched:
      "We matched you because your audience indexes high on eye-makeup content and you've posted about lash tools four times in the last 90 days.",
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
  id: 'gift-bime-beauty',
  brandName: 'Bime Beauty',
  productName: 'Bime Beauty Heated Eyelash Curler',
  productImageUrl: HEATED_CURLER_IMG,
  status: 'delivered',
  deliveredDaysAgo: 2,
}

export const DECLINE_REASONS = [
  "Didn't hold the curl long enough",
  'Heat felt too intense on my lashes',
  'Curl shape looked unnatural',
  'Battery or charging issue',
  'Pinched or pulled my lashes',
  'Not a fit for my audience',
  'Other (free text)',
] as const

// ---- DATA VIEW — product quality records.
// Reframed around Garvin's quality dimensions: every record scores
// performance, reliability, durability, sensory, ease_of_use, and value, plus
// claim verdicts and head-to-head comparisons. Records cover Bime AND its
// competitors so the dataset reflects cross-product evaluation, not a feed
// of reviews about a single product.
const BIME_PRODUCT = {
  id: 'prod_bime_heated_142',
  brand: 'Bime Beauty',
  name: 'Heated Eyelash Curler',
  category: 'beauty > eye tools > eyelash curlers',
  price_usd: 49,
  stated_claims: [
    'salon-grade lift in 5 seconds',
    'no pinching, no creasing',
    'holds curl through a full day',
    'safe on hooded and monolid eyes',
  ],
}

const TWEEZERMAN_PRODUCT = {
  id: 'prod_tweezerman_classic_001',
  brand: 'Tweezerman',
  name: 'Classic Eyelash Curler',
  category: 'beauty > eye tools > eyelash curlers',
  price_usd: 23,
  stated_claims: [
    'wide-fit curl shape',
    'replaceable silicone pad',
    'lifetime guarantee on hinge',
  ],
}

const SHISEIDO_PRODUCT = {
  id: 'prod_shiseido_curler_001',
  brand: 'Shiseido',
  name: 'Eyelash Curler',
  category: 'beauty > eye tools > eyelash curlers',
  price_usd: 22,
  stated_claims: [
    'fits a wide range of eye shapes',
    'consistent curl shape',
    'made in Japan',
  ],
}

const GRANDELASH_PRODUCT = {
  id: 'prod_grandelash_heated_001',
  brand: 'Grande Cosmetics',
  name: 'GrandeLASH Heated Curler',
  category: 'beauty > eye tools > eyelash curlers',
  price_usd: 38,
  stated_claims: [
    'heated curl in under one minute',
    'safe for sensitive lash extensions',
    'compact, travel-friendly',
  ],
}

export const PRODUCT_QUALITY_RECORDS: ProductQualityRecord[] = [
  // ---- Bime Beauty (5 records) -----------------------------------------
  {
    record_id: 'pqd_8a4f2c',
    captured_at: '2026-04-12T15:08:00Z',
    verdict: 'positive',
    product: { ...BIME_PRODUCT },
    creator: {
      id: 'creator_lashlifedaily',
      follower_count: 12_400,
      niche: 'lash_and_eye_makeup',
      relevant_attributes: {
        eye_shape: 'almond',
        skill_level: 'advanced',
        use_context: 'daily makeup routine',
      },
      comparison_set: [
        'Tweezerman Classic Eyelash Curler',
        'Shu Uemura Petal Curler',
      ],
    },
    video_signals: {
      video_duration_sec: 187,
      product_use_window_sec: 8,
      attempts_to_succeed: 1,
      observable_issues: [],
      context: {
        paired_with: ['mascara'],
        lighting: 'natural_daylight',
        environment: 'home_bathroom',
      },
    },
    quality_dimensions: {
      performance: {
        score_1_to_5: 5,
        vs_creator_expectation: 'exceeded',
        vs_brand_claims: 'met',
        evidence:
          'Heated curl held its full lift across the entire 4-minute video with zero visible softening — the long-hold advantage of the heated mechanism over manual curlers, where curl typically starts relaxing within minutes.',
      },
      reliability: {
        score_1_to_5: 4,
        consistency_notes:
          'Used daily for 2 weeks before recording — no day-to-day variance reported.',
        evidence: 'Single-attempt success; no repositioning in video.',
      },
      durability: {
        score_1_to_5: 4,
        build_quality_notes:
          'Ceramic head shows no discoloration; charging port flush; spring tension consistent across uses.',
        concerns: 'Long-term battery degradation unknown after 2 weeks.',
      },
      sensory: {
        score_1_to_5: 4,
        look: 'matte white body, premium-feeling',
        feel: 'lightweight, balanced grip',
        ergonomics: 'finger loops sized well for medium hands',
      },
      ease_of_use: {
        score_1_to_5: 5,
        friction_points: [],
        evidence:
          'On-button single press; ready indicator obvious; usable within 30s of unboxing.',
      },
      value: {
        score_1_to_5: 4,
        price_tier: 'premium ($40-60)',
        would_repurchase_at_price: true,
        notes:
          'Higher than manual curlers but performs at lash-lift-treatment level.',
      },
    },
    comparisons: [
      {
        vs_product: 'Tweezerman Classic Eyelash Curler',
        verdict: 'better',
        stronger_on: ['performance', 'reliability'],
        weaker_on: ['value'],
      },
      {
        vs_product: 'Shu Uemura Petal Curler',
        verdict: 'similar',
        stronger_on: ['ease_of_use'],
        weaker_on: ['sensory'],
      },
    ],
    summary: {
      best_for: 'almond eyes, daily wear, replacing a lash lift appointment',
      not_for: 'shoppers under $30 budget',
      standout_quality: 'curl holds through a full day without re-curling',
      biggest_weakness: 'auto shut-off cuts long routines short',
    },
  },
  {
    record_id: 'pqd_3b7e91',
    captured_at: '2026-04-13T19:42:00Z',
    verdict: 'positive',
    product: { ...BIME_PRODUCT },
    creator: {
      id: 'creator_themuabar',
      follower_count: 8_700,
      niche: 'pro_mua_makeup_science',
      relevant_attributes: {
        eye_shape: 'round',
        skill_level: 'pro',
        use_context: 'editorial client work',
      },
      comparison_set: [
        'Surratt Relevee Lash Curler',
        'Shu Uemura Petal Curler',
        'Kevyn Aucoin The Eyelash Curler',
      ],
    },
    video_signals: {
      video_duration_sec: 244,
      product_use_window_sec: 11,
      attempts_to_succeed: 1,
      observable_issues: ['minor_repositioning_for_outer_corner'],
      context: {
        paired_with: ['primer', 'mascara'],
        lighting: 'ring_light',
        environment: 'studio',
      },
    },
    quality_dimensions: {
      performance: {
        score_1_to_5: 4,
        vs_creator_expectation: 'met',
        vs_brand_claims: 'met',
        evidence:
          'Even ceramic warmth across the curl head; outer-corner pickup needed one additional pass on a model with thin lashes.',
      },
      reliability: {
        score_1_to_5: 5,
        consistency_notes:
          'Used on three models in one shoot — same lift on all three.',
        evidence: 'No drift in heat element across consecutive uses.',
      },
      durability: {
        score_1_to_5: 4,
        build_quality_notes:
          'Hinge tight; pad has not deformed; battery indicator stayed at 100% across the shoot.',
        concerns: 'Charging cable feels light-duty.',
      },
      sensory: {
        score_1_to_5: 5,
        look: 'looks at home in a pro kit',
        feel: 'pad has more give than metal curlers — appreciated by clients',
        ergonomics: 'comfortable to hold at unusual angles',
      },
      ease_of_use: {
        score_1_to_5: 4,
        friction_points: ['heat-setting cycle button is unlabeled'],
        evidence:
          'No instruction needed for primary action, but the heat selector took two cycles to map.',
      },
      value: {
        score_1_to_5: 4,
        price_tier: 'premium ($40-60)',
        would_repurchase_at_price: true,
        notes: 'Worth it as a kit tool that replaces two manual curlers.',
      },
    },
    comparisons: [
      {
        vs_product: 'Surratt Relevee Lash Curler',
        verdict: 'similar',
        stronger_on: ['reliability'],
        weaker_on: ['sensory'],
      },
      {
        vs_product: 'Shu Uemura Petal Curler',
        verdict: 'better',
        stronger_on: ['performance', 'durability'],
        weaker_on: [],
      },
      {
        vs_product: 'Kevyn Aucoin The Eyelash Curler',
        verdict: 'better',
        stronger_on: ['performance', 'value'],
        weaker_on: [],
      },
    ],
    summary: {
      best_for: 'pro kits, multi-client use',
      not_for: 'creators who want one-button simplicity',
      standout_quality: 'consistent heat across consecutive uses',
      biggest_weakness: 'unlabeled heat-setting button',
    },
  },
  {
    record_id: 'pqd_d12fa0',
    captured_at: '2026-04-14T22:15:00Z',
    verdict: 'negative',
    product: { ...BIME_PRODUCT },
    creator: {
      id: 'creator_hoodedeyebeauty',
      follower_count: 23_000,
      niche: 'hooded_eye_monolid_makeup',
      relevant_attributes: {
        eye_shape: 'hooded',
        skill_level: 'advanced',
        use_context: 'daily makeup routine',
      },
      comparison_set: [
        'Shiseido Eyelash Curler',
        'Shu Uemura Petal Curler',
        'Grande Cosmetics GrandeLASH Heated Curler',
      ],
    },
    video_signals: {
      video_duration_sec: 312,
      product_use_window_sec: 15,
      attempts_to_succeed: 2,
      observable_issues: ['head_blocked_by_brow_bone_on_first_attempt'],
      context: {
        paired_with: ['mascara'],
        lighting: 'natural_daylight',
        environment: 'home_bathroom',
      },
    },
    quality_dimensions: {
      performance: {
        score_1_to_5: 3,
        vs_creator_expectation: 'fell_short',
        vs_brand_claims: 'fell_short',
        evidence:
          'Brand claims hooded-eye safe; in practice, head shape blocks the inner third on hooded lids and required a re-attempt.',
      },
      reliability: {
        score_1_to_5: 4,
        consistency_notes:
          'When positioning was right, lift was repeatable across both eyes.',
        evidence: 'Two attempts to succeed but consistent outcome once placed.',
      },
      durability: {
        score_1_to_5: 4,
        build_quality_notes:
          'No build issues observed; ceramic head still warm-to-touch but not damaging.',
        concerns: 'Pad may collect mascara residue over weeks.',
      },
      sensory: {
        score_1_to_5: 3,
        look: 'fine, but bulky head reads larger than competitors on camera',
        feel: 'comfortable',
        ergonomics: 'curl head footprint too tall for hooded-lid users',
      },
      ease_of_use: {
        score_1_to_5: 3,
        friction_points: [
          'requires repositioning on hooded lids',
          'warm-up window long when timing eyeliner around it',
        ],
        evidence: 'Two attempts before getting a clean lift.',
      },
      value: {
        score_1_to_5: 3,
        price_tier: 'premium ($40-60)',
        would_repurchase_at_price: false,
        notes: 'Performance gap on hooded eyes makes the price hard to justify.',
      },
    },
    comparisons: [
      {
        vs_product: 'Shiseido Eyelash Curler',
        verdict: 'similar',
        stronger_on: ['durability'],
        weaker_on: ['ease_of_use'],
      },
      {
        vs_product: 'Shu Uemura Petal Curler',
        verdict: 'similar',
        stronger_on: [],
        weaker_on: ['performance'],
      },
      {
        vs_product: 'Grande Cosmetics GrandeLASH Heated Curler',
        verdict: 'worse',
        stronger_on: [],
        weaker_on: ['performance', 'ease_of_use'],
      },
    ],
    summary: {
      best_for: 'almond and round shapes',
      not_for: 'hooded or monolid eyes; the head shape blocks the inner third',
      standout_quality: 'heat consistency once positioned',
      biggest_weakness: 'curl-head footprint conflicts with brow bone on hooded lids',
    },
  },
  {
    record_id: 'pqd_5e0b34',
    captured_at: '2026-04-16T17:55:00Z',
    verdict: 'positive',
    product: { ...BIME_PRODUCT },
    creator: {
      id: 'creator_beautytoolnerd',
      follower_count: 15_200,
      niche: 'beauty_tool_reviews',
      relevant_attributes: {
        eye_shape: 'almond',
        skill_level: 'intermediate',
        use_context: 'side-by-side product review',
      },
      comparison_set: [
        'Tweezerman Classic Eyelash Curler',
        'Grande Cosmetics GrandeLASH Heated Curler',
        'Revlon Lash Curler',
      ],
    },
    video_signals: {
      video_duration_sec: 421,
      product_use_window_sec: 10,
      attempts_to_succeed: 1,
      observable_issues: [],
      context: {
        paired_with: [],
        lighting: 'ring_light',
        environment: 'home_studio',
      },
    },
    quality_dimensions: {
      performance: {
        score_1_to_5: 5,
        vs_creator_expectation: 'exceeded',
        vs_brand_claims: 'met',
        evidence:
          'Quantitative comparison: held curl through end of recording while Tweezerman had visibly relaxed within 4 minutes.',
      },
      reliability: {
        score_1_to_5: 4,
        consistency_notes: 'Same lift across left and right eye.',
        evidence: 'Side-by-side eye comparison shown in video.',
      },
      durability: {
        score_1_to_5: 4,
        build_quality_notes:
          'No fingerprints on body finish; pad firm; charging dock clicks satisfyingly.',
        concerns: 'On/off button needs firm long-press; may wear over time.',
      },
      sensory: {
        score_1_to_5: 4,
        look: 'clean, minimalist',
        feel: 'softer pad than Tweezerman; no creasing at the lash base',
        ergonomics: 'standard finger-loop layout',
      },
      ease_of_use: {
        score_1_to_5: 4,
        friction_points: ['power button discovery'],
        evidence: 'First-time setup completed without instructions.',
      },
      value: {
        score_1_to_5: 5,
        price_tier: 'premium ($40-60)',
        would_repurchase_at_price: true,
        notes:
          'For a heated curler, $49 is mid-pack pricing; the performance is top-pack.',
      },
    },
    comparisons: [
      {
        vs_product: 'Tweezerman Classic Eyelash Curler',
        verdict: 'better',
        stronger_on: ['performance', 'reliability', 'sensory'],
        weaker_on: ['value'],
      },
      {
        vs_product: 'Grande Cosmetics GrandeLASH Heated Curler',
        verdict: 'better',
        stronger_on: ['performance', 'durability'],
        weaker_on: [],
      },
      {
        vs_product: 'Revlon Lash Curler',
        verdict: 'better',
        stronger_on: ['performance', 'durability', 'sensory'],
        weaker_on: ['value'],
      },
    ],
    summary: {
      best_for: 'side-by-side reviewers, almond eyes, daily heated-curler users',
      not_for: 'first-time curler shoppers (overspec for the use)',
      standout_quality: 'curl hold time outclasses every manual curler in the comparison set',
      biggest_weakness: 'power button needs a firm long-press; not obvious on first use',
    },
  },
  {
    record_id: 'pqd_4f8d22',
    captured_at: '2026-04-19T20:03:00Z',
    verdict: 'positive',
    product: { ...BIME_PRODUCT },
    creator: {
      id: 'creator_lashtechgrad',
      follower_count: 9_400,
      niche: 'lash_technician',
      relevant_attributes: {
        eye_shape: 'almond',
        skill_level: 'pro',
        use_context: 'in-studio client prep',
      },
      comparison_set: [
        'Surratt Relevee Lash Curler',
        'Grande Cosmetics GrandeLASH Heated Curler',
      ],
    },
    video_signals: {
      video_duration_sec: 268,
      product_use_window_sec: 7,
      attempts_to_succeed: 1,
      observable_issues: [],
      context: {
        paired_with: ['mascara'],
        lighting: 'natural_daylight',
        environment: 'lash_studio',
      },
    },
    quality_dimensions: {
      performance: {
        score_1_to_5: 5,
        vs_creator_expectation: 'exceeded',
        vs_brand_claims: 'met',
        evidence:
          'Closest at-home replacement for in-studio lash lift I have measured. Hit full lift in one pass on a client.',
      },
      reliability: {
        score_1_to_5: 5,
        consistency_notes:
          'Used on five clients in one day; same lift on every one.',
        evidence: 'Multi-client validation in single recording day.',
      },
      durability: {
        score_1_to_5: 4,
        build_quality_notes:
          'Heating element shows no degradation; pad surface still smooth.',
        concerns: 'Charging dock would benefit from a magnetic snap.',
      },
      sensory: {
        score_1_to_5: 5,
        look: 'studio-appropriate',
        feel: 'precision matches my pro tools',
        ergonomics: 'comfortable for back-to-back use',
      },
      ease_of_use: {
        score_1_to_5: 5,
        friction_points: [],
        evidence: 'No instruction needed; ready light is unambiguous.',
      },
      value: {
        score_1_to_5: 5,
        price_tier: 'premium ($40-60)',
        would_repurchase_at_price: true,
        notes:
          'Pays for itself in clients who skip a $90 lash-lift service.',
      },
    },
    comparisons: [
      {
        vs_product: 'Surratt Relevee Lash Curler',
        verdict: 'better',
        stronger_on: ['performance', 'reliability'],
        weaker_on: [],
      },
      {
        vs_product: 'Grande Cosmetics GrandeLASH Heated Curler',
        verdict: 'better',
        stronger_on: ['performance', 'durability', 'sensory'],
        weaker_on: [],
      },
    ],
    summary: {
      best_for: 'pro use, almond/round eyes, replacing in-studio lash-lift',
      not_for: 'budget-first shoppers',
      standout_quality: 'precision matches pro studio tools',
      biggest_weakness: 'charging dock should be magnetic',
    },
  },
  // ---- Tweezerman Classic Eyelash Curler (3 records) -------------------
  {
    record_id: 'pqd_a44e90',
    captured_at: '2026-04-11T14:02:00Z',
    verdict: 'positive',
    product: { ...TWEEZERMAN_PRODUCT },
    creator: {
      id: 'creator_brushandlash',
      follower_count: 17_000,
      niche: 'everyday_makeup',
      relevant_attributes: {
        eye_shape: 'round',
        skill_level: 'intermediate',
        use_context: 'A/B against heated curler',
      },
      comparison_set: [
        'Bime Beauty Heated Eyelash Curler',
        'Shiseido Eyelash Curler',
      ],
    },
    video_signals: {
      video_duration_sec: 198,
      product_use_window_sec: 5,
      attempts_to_succeed: 1,
      observable_issues: ['curl_relaxed_within_4_min'],
      context: {
        paired_with: ['mascara'],
        lighting: 'natural_daylight',
        environment: 'home_bathroom',
      },
    },
    quality_dimensions: {
      performance: {
        score_1_to_5: 3,
        vs_creator_expectation: 'met',
        vs_brand_claims: 'met',
        evidence:
          'Lift on first pump but visible relaxation within 4 min on round-eye lashes.',
      },
      reliability: {
        score_1_to_5: 5,
        consistency_notes:
          'Owned three years; same outcome every time.',
        evidence: 'Long-term ownership references.',
      },
      durability: {
        score_1_to_5: 5,
        build_quality_notes:
          'Stainless steel body, no rust after years of bathroom use; replaceable pad.',
        concerns: 'None.',
      },
      sensory: {
        score_1_to_5: 4,
        look: 'classic chrome, recognizable',
        feel: 'cool metal; firm pad',
        ergonomics: 'standard finger-loop layout',
      },
      ease_of_use: {
        score_1_to_5: 5,
        friction_points: [],
        evidence: 'Beginner-friendly; no learning curve.',
      },
      value: {
        score_1_to_5: 5,
        price_tier: 'mid ($20-30)',
        would_repurchase_at_price: true,
        notes: 'Hard to beat at $23 if you do not need all-day hold.',
      },
    },
    comparisons: [
      {
        vs_product: 'Bime Beauty Heated Eyelash Curler',
        verdict: 'worse',
        stronger_on: ['durability', 'value'],
        weaker_on: ['performance'],
      },
      {
        vs_product: 'Shiseido Eyelash Curler',
        verdict: 'similar',
        stronger_on: ['durability'],
        weaker_on: [],
      },
    ],
    summary: {
      best_for: 'budget-conscious daily use, lash-curler beginners',
      not_for: 'all-day-hold use cases',
      standout_quality: 'durability — survives years of bathroom use',
      biggest_weakness: 'curl drops within 4 minutes on round-eye lashes',
    },
  },
  {
    record_id: 'pqd_61e0b8',
    captured_at: '2026-04-15T09:14:00Z',
    verdict: 'negative',
    product: { ...TWEEZERMAN_PRODUCT },
    creator: {
      id: 'creator_curlandhold',
      follower_count: 28_000,
      niche: 'long_lasting_makeup',
      relevant_attributes: {
        eye_shape: 'round',
        skill_level: 'intermediate',
        use_context: 'all-day-hold test',
      },
      comparison_set: [
        'Bime Beauty Heated Eyelash Curler',
        'Shu Uemura Petal Curler',
      ],
    },
    video_signals: {
      video_duration_sec: 156,
      product_use_window_sec: 4,
      attempts_to_succeed: 1,
      observable_issues: ['curl_lost_by_lunch'],
      context: {
        paired_with: ['waterproof_mascara'],
        lighting: 'mixed_indoor',
        environment: 'office',
      },
    },
    quality_dimensions: {
      performance: {
        score_1_to_5: 2,
        vs_creator_expectation: 'fell_short',
        vs_brand_claims: 'fell_short',
        evidence:
          'Lift visibly relaxed by lunch even with waterproof mascara holding the curl.',
      },
      reliability: {
        score_1_to_5: 5,
        consistency_notes:
          'Always relaxes by lunch — predictable failure mode.',
        evidence: 'Consistent across two weeks of testing.',
      },
      durability: {
        score_1_to_5: 5,
        build_quality_notes:
          'Tool itself is bulletproof; the limitation is curl persistence, not the tool.',
        concerns: 'None.',
      },
      sensory: {
        score_1_to_5: 4,
        look: 'classic chrome',
        feel: 'cool metal',
        ergonomics: 'standard',
      },
      ease_of_use: {
        score_1_to_5: 5,
        friction_points: [],
        evidence: 'Zero learning curve.',
      },
      value: {
        score_1_to_5: 3,
        price_tier: 'mid ($20-30)',
        would_repurchase_at_price: false,
        notes:
          'For a creator who needs all-day hold, $23 spent here is wasted vs upgrading to heated.',
      },
    },
    comparisons: [
      {
        vs_product: 'Bime Beauty Heated Eyelash Curler',
        verdict: 'worse',
        stronger_on: ['durability'],
        weaker_on: ['performance'],
      },
      {
        vs_product: 'Shu Uemura Petal Curler',
        verdict: 'similar',
        stronger_on: ['value'],
        weaker_on: [],
      },
    ],
    summary: {
      best_for: 'occasional / short-day wear, beginners, indestructible-tool seekers',
      not_for: 'all-day events, work-day hold',
      standout_quality: 'tool durability',
      biggest_weakness: 'curl drops by lunch — fundamental limit of unheated curling',
    },
  },
  {
    record_id: 'pqd_7c2349',
    captured_at: '2026-04-18T11:37:00Z',
    verdict: 'negative',
    product: { ...TWEEZERMAN_PRODUCT },
    creator: {
      id: 'creator_minimalmakeupgirl',
      follower_count: 6_800,
      niche: 'minimalist_makeup',
      relevant_attributes: {
        eye_shape: 'downturned',
        skill_level: 'beginner',
        use_context: 'first-time curler purchase',
      },
      comparison_set: ['Revlon Lash Curler'],
    },
    video_signals: {
      video_duration_sec: 142,
      product_use_window_sec: 6,
      attempts_to_succeed: 2,
      observable_issues: ['curve_did_not_match_eye_shape'],
      context: {
        paired_with: [],
        lighting: 'mixed_indoor',
        environment: 'home_bathroom',
      },
    },
    quality_dimensions: {
      performance: {
        score_1_to_5: 2,
        vs_creator_expectation: 'fell_short',
        vs_brand_claims: 'met',
        evidence:
          'Curve did not match downturned eye shape; required a second attempt with repositioning.',
      },
      reliability: {
        score_1_to_5: 4,
        consistency_notes: 'Same outcome second day.',
        evidence: 'Two-day spot check.',
      },
      durability: {
        score_1_to_5: 5,
        build_quality_notes: 'Solid stainless steel construction.',
        concerns: 'None.',
      },
      sensory: {
        score_1_to_5: 3,
        look: 'classic chrome',
        feel: 'cool metal',
        ergonomics: 'finger loops slightly large for small hands',
      },
      ease_of_use: {
        score_1_to_5: 3,
        friction_points: ['curve fit unclear at purchase time'],
        evidence: 'Took two attempts to position.',
      },
      value: {
        score_1_to_5: 3,
        price_tier: 'mid ($20-30)',
        would_repurchase_at_price: false,
        notes: 'Would try a downturned-specific curler next.',
      },
    },
    comparisons: [
      {
        vs_product: 'Revlon Lash Curler',
        verdict: 'similar',
        stronger_on: ['durability'],
        weaker_on: [],
      },
    ],
    summary: {
      best_for: 'almond and round eye shapes, beginners',
      not_for: 'downturned or hooded eye shapes',
      standout_quality: 'build quality',
      biggest_weakness: 'one-curve-fits-all design misses non-almond shapes',
    },
  },
  // ---- Shiseido Eyelash Curler (2 records) -----------------------------
  {
    record_id: 'pqd_b3a071',
    captured_at: '2026-04-13T08:21:00Z',
    verdict: 'positive',
    product: { ...SHISEIDO_PRODUCT },
    creator: {
      id: 'creator_themuabar',
      follower_count: 8_700,
      niche: 'pro_mua_makeup_science',
      relevant_attributes: {
        eye_shape: 'round',
        skill_level: 'pro',
        use_context: 'tool comparison for client kit',
      },
      comparison_set: [
        'Bime Beauty Heated Eyelash Curler',
        'Shu Uemura Petal Curler',
      ],
    },
    video_signals: {
      video_duration_sec: 203,
      product_use_window_sec: 6,
      attempts_to_succeed: 1,
      observable_issues: [],
      context: {
        paired_with: ['mascara'],
        lighting: 'ring_light',
        environment: 'studio',
      },
    },
    quality_dimensions: {
      performance: {
        score_1_to_5: 4,
        vs_creator_expectation: 'met',
        vs_brand_claims: 'met',
        evidence: 'Clean curl on first attempt; held through 3-min window.',
      },
      reliability: {
        score_1_to_5: 5,
        consistency_notes:
          'Used on multiple clients with consistent curve fit.',
        evidence: 'Multi-client studio shoot.',
      },
      durability: {
        score_1_to_5: 5,
        build_quality_notes:
          'Pad replaceable; spring tension consistent over years per creator history.',
        concerns: 'None observed.',
      },
      sensory: {
        score_1_to_5: 5,
        look: 'minimalist Japanese design',
        feel: 'warmer in hand than chrome competitors',
        ergonomics: 'wide curve fits a wide range of eye shapes',
      },
      ease_of_use: {
        score_1_to_5: 5,
        friction_points: [],
        evidence: 'Zero learning curve.',
      },
      value: {
        score_1_to_5: 5,
        price_tier: 'mid ($20-30)',
        would_repurchase_at_price: true,
        notes: 'Best-in-class manual curler at this price.',
      },
    },
    comparisons: [
      {
        vs_product: 'Bime Beauty Heated Eyelash Curler',
        verdict: 'worse',
        stronger_on: ['value', 'durability'],
        weaker_on: ['performance'],
      },
      {
        vs_product: 'Shu Uemura Petal Curler',
        verdict: 'similar',
        stronger_on: ['durability'],
        weaker_on: [],
      },
    ],
    summary: {
      best_for: 'manual-curler purists, mid-budget, varied eye shapes',
      not_for: 'all-day-hold use cases',
      standout_quality: 'wide-fit curve',
      biggest_weakness: 'inherent limit of an unheated curler on hold time',
    },
  },
  {
    record_id: 'pqd_c01f88',
    captured_at: '2026-04-17T13:09:00Z',
    verdict: 'positive',
    product: { ...SHISEIDO_PRODUCT },
    creator: {
      id: 'creator_lashjourney',
      follower_count: 11_000,
      niche: 'sensitive_skin_makeup',
      relevant_attributes: {
        eye_shape: 'monolid',
        skill_level: 'intermediate',
        use_context: 'daily wear after heated curler caused irritation',
      },
      comparison_set: [
        'Bime Beauty Heated Eyelash Curler',
        'Shu Uemura Petal Curler',
      ],
    },
    video_signals: {
      video_duration_sec: 174,
      product_use_window_sec: 7,
      attempts_to_succeed: 2,
      observable_issues: ['outer_corner_required_second_pass'],
      context: {
        paired_with: ['mascara'],
        lighting: 'natural_daylight',
        environment: 'home_bathroom',
      },
    },
    quality_dimensions: {
      performance: {
        score_1_to_5: 3,
        vs_creator_expectation: 'met',
        vs_brand_claims: 'met',
        evidence:
          'Curl achieved but outer corner needed a second pass on monolid shape.',
      },
      reliability: {
        score_1_to_5: 4,
        consistency_notes: 'Predictable across two-week wear test.',
        evidence: 'Two-week consistency.',
      },
      durability: {
        score_1_to_5: 5,
        build_quality_notes: 'Solid build, no sign of wear.',
        concerns: 'None.',
      },
      sensory: {
        score_1_to_5: 4,
        look: 'minimalist',
        feel: 'pad pressure fine on sensitive skin',
        ergonomics: 'curve does not catch monolid inner third easily',
      },
      ease_of_use: {
        score_1_to_5: 4,
        friction_points: ['outer corner needs second pass on monolid eyes'],
        evidence: 'Two passes per use.',
      },
      value: {
        score_1_to_5: 4,
        price_tier: 'mid ($20-30)',
        would_repurchase_at_price: true,
        notes: 'Strong default for sensitive-skin users avoiding heat.',
      },
    },
    comparisons: [
      {
        vs_product: 'Bime Beauty Heated Eyelash Curler',
        verdict: 'better',
        stronger_on: ['ease_of_use', 'value'],
        weaker_on: ['performance'],
      },
      {
        vs_product: 'Shu Uemura Petal Curler',
        verdict: 'similar',
        stronger_on: [],
        weaker_on: [],
      },
    ],
    summary: {
      best_for: 'sensitive-skin users, monolid eyes that react to heated tools',
      not_for: 'all-day-hold use cases',
      standout_quality: 'gentle on sensitive lid skin',
      biggest_weakness: 'outer-corner reach on monolid eyes',
    },
  },
  // ---- GrandeLASH Heated Curler (2 records) ----------------------------
  {
    record_id: 'pqd_e2c544',
    captured_at: '2026-04-15T16:48:00Z',
    verdict: 'negative',
    product: { ...GRANDELASH_PRODUCT },
    creator: {
      id: 'creator_cleanmakeupcollective',
      follower_count: 8_100,
      niche: 'clean_beauty',
      relevant_attributes: {
        eye_shape: 'almond',
        skill_level: 'intermediate',
        use_context: 'travel-friendly daily use',
      },
      comparison_set: [
        'Bime Beauty Heated Eyelash Curler',
        'Shiseido Eyelash Curler',
      ],
    },
    video_signals: {
      video_duration_sec: 165,
      product_use_window_sec: 9,
      attempts_to_succeed: 1,
      observable_issues: ['heat_uneven_at_curl_head_edges'],
      context: {
        paired_with: ['mascara'],
        lighting: 'natural_daylight',
        environment: 'hotel_bathroom',
      },
    },
    quality_dimensions: {
      performance: {
        score_1_to_5: 3,
        vs_creator_expectation: 'met',
        vs_brand_claims: 'met',
        evidence:
          'Lift achieved; outer 2mm of curl head ran cooler than center, leaving edge lashes less curled.',
      },
      reliability: {
        score_1_to_5: 3,
        consistency_notes:
          'Uneven heat distribution made outer edge lashes inconsistent across sessions.',
        evidence: 'Visible variance between left and right eye in same session.',
      },
      durability: {
        score_1_to_5: 3,
        build_quality_notes:
          'Plastic body feels lighter-duty than ceramic competitors.',
        concerns: 'Hinge play after two weeks.',
      },
      sensory: {
        score_1_to_5: 3,
        look: 'travel-tool aesthetic',
        feel: 'lightweight, slightly cheap',
        ergonomics: 'compact for travel',
      },
      ease_of_use: {
        score_1_to_5: 4,
        friction_points: ['heat indicator could be brighter'],
        evidence: 'Single-attempt success.',
      },
      value: {
        score_1_to_5: 4,
        price_tier: 'mid-premium ($30-45)',
        would_repurchase_at_price: true,
        notes:
          'A reasonable cheaper-than-Bime option if travel-size is the priority.',
      },
    },
    comparisons: [
      {
        vs_product: 'Bime Beauty Heated Eyelash Curler',
        verdict: 'worse',
        stronger_on: ['value'],
        weaker_on: ['performance', 'reliability', 'durability'],
      },
      {
        vs_product: 'Shiseido Eyelash Curler',
        verdict: 'better',
        stronger_on: ['performance'],
        weaker_on: ['durability'],
      },
    ],
    summary: {
      best_for: 'travel use, cheaper entry into heated curlers',
      not_for: 'pro use, daily-driver replacement for high-end heated curlers',
      standout_quality: 'compact form factor',
      biggest_weakness: 'uneven heat at curl-head edges',
    },
  },
  {
    record_id: 'pqd_f81d29',
    captured_at: '2026-04-21T19:22:00Z',
    verdict: 'positive',
    product: { ...GRANDELASH_PRODUCT },
    creator: {
      id: 'creator_hoodedeyebeauty',
      follower_count: 23_000,
      niche: 'hooded_eye_monolid_makeup',
      relevant_attributes: {
        eye_shape: 'hooded',
        skill_level: 'advanced',
        use_context: 'comparison vs Bime on hooded eyes',
      },
      comparison_set: [
        'Bime Beauty Heated Eyelash Curler',
        'Shu Uemura Petal Curler',
      ],
    },
    video_signals: {
      video_duration_sec: 226,
      product_use_window_sec: 11,
      attempts_to_succeed: 1,
      observable_issues: [],
      context: {
        paired_with: ['mascara'],
        lighting: 'ring_light',
        environment: 'home_studio',
      },
    },
    quality_dimensions: {
      performance: {
        score_1_to_5: 4,
        vs_creator_expectation: 'exceeded',
        vs_brand_claims: 'met',
        evidence:
          'Compact head reached the inner third of hooded lids without repositioning, where Bime did not.',
      },
      reliability: {
        score_1_to_5: 4,
        consistency_notes: 'Repeatable across left and right eye.',
        evidence: 'Same single-pass outcome on both sides.',
      },
      durability: {
        score_1_to_5: 3,
        build_quality_notes:
          'Plastic body but no observed degradation after one week.',
        concerns: 'Long-term hinge wear unknown.',
      },
      sensory: {
        score_1_to_5: 3,
        look: 'travel-tool aesthetic',
        feel: 'lightweight',
        ergonomics: 'compact head fits hooded lids',
      },
      ease_of_use: {
        score_1_to_5: 4,
        friction_points: [],
        evidence: 'Single-attempt success on hooded eyes.',
      },
      value: {
        score_1_to_5: 4,
        price_tier: 'mid-premium ($30-45)',
        would_repurchase_at_price: true,
        notes:
          'Better value than Bime specifically for hooded-eye users.',
      },
    },
    comparisons: [
      {
        vs_product: 'Bime Beauty Heated Eyelash Curler',
        verdict: 'better',
        stronger_on: ['performance', 'ease_of_use', 'value'],
        weaker_on: ['durability'],
      },
      {
        vs_product: 'Shu Uemura Petal Curler',
        verdict: 'better',
        stronger_on: ['performance'],
        weaker_on: [],
      },
    ],
    summary: {
      best_for: 'hooded and monolid eyes, mid-budget heated-curler shoppers',
      not_for: 'shoppers who want a premium-feel tool',
      standout_quality: 'compact head reaches inner third on hooded lids',
      biggest_weakness: 'plastic body feels less durable than competitors',
    },
  },
]

// ---- PRODUCT SUMMARY (3 competing eyelash-curler products)
export const PRODUCT_SUMMARY: ProductSummary[] = [
  {
    id: 'bime-beauty',
    name: 'Bime Beauty Heated Curler',
    isFeatured: true,
    postRate: 0.81,
    postCountText: '38 of 47 creators',
    avgSentiment: 4.6,
    conversionPct: 5.2,
    topThemeLabel: 'TOP THEME',
    topThemeQuote: 'held my curl through a 12-hour day',
  },
  {
    id: 'tweezerman-classic',
    name: 'Tweezerman Classic (regular)',
    isFeatured: false,
    postRate: 0.27,
    postCountText: '12 of 45 creators',
    avgSentiment: 3.2,
    conversionPct: 1.8,
    topThemeLabel: 'TOP DECLINE REASON',
    topThemeQuote: "curl drops out by lunch",
  },
  {
    id: 'shiseido-curler',
    name: 'Shiseido Curler (regular)',
    isFeatured: false,
    postRate: 0.075,
    postCountText: '3 of 40 creators',
    avgSentiment: 2.1,
    conversionPct: 0.6,
    topThemeLabel: 'TOP DECLINE REASON',
    topThemeQuote: "doesn't fit my eye shape",
  },
]

// ---- AMAZON PRODUCTS (6 cards, ids A–F per spec)
// Mix of regular manual curlers and heated curlers; Bime is featured.
export const AMAZON_PRODUCTS: AmazonProduct[] = [
  {
    id: 'A',
    title: 'Tweezerman Classic Eyelash Curler',
    imageUrl: TWEEZERMAN_IMG,
    rating: 4.5,
    reviewCount: 28_412,
    priceUsd: 23.0,
    prime: true,
    sponsored: true,
    flagged: true,
  },
  {
    id: 'B',
    title: 'Shiseido Eyelash Curler',
    imageUrl: SHISEIDO_IMG,
    rating: 4.6,
    reviewCount: 14_923,
    priceUsd: 22.0,
    prime: true,
  },
  {
    id: 'C',
    title: 'Bime Beauty Heated Eyelash Curler',
    imageUrl: HEATED_CURLER_IMG,
    rating: 4.7,
    reviewCount: 412,
    priceUsd: 49.0,
    prime: true,
    isFeatured: true,
  },
  {
    id: 'D',
    title: 'Revlon Lash Curler',
    imageUrl: REVLON_IMG,
    rating: 4.4,
    reviewCount: 47_109,
    priceUsd: 6.97,
    prime: true,
  },
  {
    id: 'E',
    title: 'Grande Cosmetics GrandeLASH Heated Curler',
    imageUrl: GRANDELASH_IMG,
    rating: 4.2,
    reviewCount: 5_241,
    priceUsd: 38.0,
    prime: true,
  },
  {
    id: 'F',
    title: 'Kevyn Aucoin The Eyelash Curler',
    imageUrl: KEVYN_AUCOIN_IMG,
    rating: 4.3,
    reviewCount: 9_840,
    priceUsd: 22.0,
    prime: true,
  },
]

// Product grid orders for the two Rufus states
export const ORDER_WITHOUT_GIFTLY: string[] = ['A', 'D', 'B', 'F', 'E', 'C']
export const ORDER_WITH_GIFTLY: string[] = ['C', 'A', 'B', 'E', 'D', 'F']

// ---- RUFUS THREADS
export const RUFUS_WITHOUT_GIFTLY: RufusResponse = {
  thread: [
    {
      speaker: 'user',
      text: 'best eyelash curler that holds all day',
    },
    {
      speaker: 'rufus',
      text: 'Based on Amazon customer reviews and bestseller data, here are the top picks:',
      bullets: [
        {
          title: 'Tweezerman Classic Eyelash Curler',
          body: '4.5★ with over 28,000 reviews. Many customers say it gives a clean lift and lasts for years.',
        },
        {
          title: 'Revlon Lash Curler',
          body: 'A budget bestseller with 4.4★ from 47,000+ reviews.',
        },
        {
          title: 'Shiseido Eyelash Curler',
          body: 'A long-running favorite with 4.6★ from over 14,000 customers.',
        },
      ],
      reviewQuote:
        'Came in cute packaging, my cat loves the box!!! 5 stars!!!',
    },
  ],
}

// ==========================================================================
// PIPELINE OUTPUTS — what the seven-stage pipeline produces on top of the
// raw ProductQualityRecord corpus above. Lives alongside the records, not
// instead of them: the records are the "before", these are the "after".
// ==========================================================================

// ---- Hero video raw streams ---------------------------------------------
// Samantha Lee's full Bime evaluation (record pqd_8a4f2c, 187s = 3:07).
// Only the hero record carries full transcript/visual/facial data; the rest
// hold attributes only.
export const HERO_VIDEO_ID = 'pqd_8a4f2c'

export const HERO_TRANSCRIPT: TranscriptSegment[] = [
  { ts: '0:03', ts_seconds: 3, text: "okay so this is the bime heated curler — i've been testing it daily for two weeks" },
  { ts: '0:12', ts_seconds: 12, text: "first impression, the body is matte white, premium-feeling — doesn't read drugstore at all" },
  { ts: '0:24', ts_seconds: 24, text: "ready light hits in about thirty seconds, really clear indicator" },
  { ts: '0:34', ts_seconds: 34, text: "the on-button is a single press — no holding it down or anything weird" },
  { ts: '0:48', ts_seconds: 48, text: "alright let me actually curl my right eye now" },
  { ts: '0:55', ts_seconds: 55, text: "one pump, eight seconds — you can already see the lift coming up" },
  { ts: '1:18', ts_seconds: 78, text: "i've used this every morning for two weeks, zero day-to-day variance" },
  { ts: '1:42', ts_seconds: 102, text: "compared to my old tweezerman, look at the difference between these two eyes" },
  { ts: '2:04', ts_seconds: 124, text: "the thing that sold me is the hold — by six pm my tweezerman curl is just gone" },
  { ts: '2:30', ts_seconds: 150, text: "the one annoying thing is auto-shutoff, ten minutes is short for a full routine" },
  { ts: '2:48', ts_seconds: 168, text: "but honestly at forty-nine dollars it's already paid itself off versus a lash lift" },
  { ts: '3:02', ts_seconds: 182, text: "this replaces a salon appointment, that's how i'm thinking about it" },
]

export const HERO_VISUAL_OBS: VisualObservation[] = [
  { ts: '0:05', ts_seconds: 5, observation: 'evaluator holds curler in right hand, rotates to camera' },
  { ts: '0:18', ts_seconds: 18, observation: 'evaluator points at ceramic head' },
  { ts: '0:36', ts_seconds: 36, observation: 'evaluator depresses on-button; status LED turns coral' },
  { ts: '0:50', ts_seconds: 50, observation: 'evaluator positions curler against right eyelid' },
  { ts: '0:58', ts_seconds: 58, observation: 'evaluator squeezes curler against lashes for ~8 seconds' },
  { ts: '1:45', ts_seconds: 105, observation: 'evaluator turns face to compare both eyes side by side' },
  { ts: '2:08', ts_seconds: 128, observation: 'evaluator points at right-eye curl, then left for contrast' },
  { ts: '2:34', ts_seconds: 154, observation: 'device emits audible auto-shutoff beep' },
]

export const HERO_FACIAL_CUES: FacialCue[] = [
  { ts: '0:12', ts_seconds: 12, inferred_state: 'engaged' },
  { ts: '0:55', ts_seconds: 55, inferred_state: 'satisfied' },
  { ts: '1:42', ts_seconds: 102, inferred_state: 'delighted' },
  { ts: '2:32', ts_seconds: 152, inferred_state: 'mild_irritation' },
  { ts: '2:48', ts_seconds: 168, inferred_state: 'satisfied' },
]

// ---- Per-video extractions ----------------------------------------------
// Open-vocabulary attributes derived per-video by the stage-4 LLM. The hero
// record carries full timestamp-anchored evidence; the other 11 records hold
// attributes only (so the demo data stays readable). All records'
// `record_id` cross-references the matching ProductQualityRecord above.
export const PER_VIDEO_EXTRACTIONS: PerVideoExtraction[] = [
  // ----- Bime ------------------------------------------------------------
  {
    record_id: 'pqd_8a4f2c', // HERO
    product_id: 'prod_bime_heated_142',
    product_name: 'Bime Beauty Heated Eyelash Curler',
    brand: 'Bime Beauty',
    creator_id: 'creator_lashlifedaily',
    verdict: 'positive',
    transcript: HERO_TRANSCRIPT,
    visual_observations: HERO_VISUAL_OBS,
    facial_cues: HERO_FACIAL_CUES,
    attributes: [
      {
        canonical_name: 'curl_hold_duration',
        display_label: 'Curl hold duration',
        score_1_to_5: 5,
        evidence: {
          transcript: { ts: '2:04', quote: "by six pm my tweezerman curl is just gone" },
          visual: { ts: '1:45', quote: 'evaluator compares both eyes side by side' },
          facial: { ts: '1:42', cue: 'delighted' },
        },
      },
      {
        canonical_name: 'learning_curve',
        display_label: 'Learning curve',
        score_1_to_5: 5,
        evidence: {
          transcript: { ts: '0:34', quote: "the on-button is a single press — no holding it down" },
          visual: { ts: '0:36', quote: 'evaluator depresses on-button; status LED turns coral' },
        },
      },
      {
        canonical_name: 'heat_evenness',
        display_label: 'Heat evenness',
        score_1_to_5: 4,
        evidence: {
          transcript: { ts: '0:55', quote: "one pump, eight seconds — you can already see the lift" },
          visual: { ts: '0:58', quote: 'evaluator squeezes curler against lashes for ~8 seconds' },
        },
      },
      {
        canonical_name: 'curl_shape_naturalness',
        display_label: 'Curl shape naturalness',
        score_1_to_5: 5,
        evidence: {
          transcript: { ts: '1:42', quote: "look at the difference between these two eyes" },
          facial: { ts: '1:42', cue: 'delighted' },
        },
      },
      {
        canonical_name: 'lash_pinch_safety',
        display_label: 'Lash pinch safety',
        score_1_to_5: 5,
        evidence: {
          visual: { ts: '0:58', quote: 'no observable lash deformation during 8-second squeeze' },
        },
      },
    ],
  },
  {
    record_id: 'pqd_3b7e91',
    product_id: 'prod_bime_heated_142',
    product_name: 'Bime Beauty Heated Eyelash Curler',
    brand: 'Bime Beauty',
    creator_id: 'creator_themuabar',
    verdict: 'positive',
    transcript: [],
    visual_observations: [],
    facial_cues: [],
    attributes: [
      { canonical_name: 'heat_evenness', display_label: 'Heat evenness', score_1_to_5: 4, evidence: {} },
      { canonical_name: 'curl_hold_duration', display_label: 'Curl hold duration', score_1_to_5: 5, evidence: {} },
      { canonical_name: 'alignment_ease', display_label: 'Alignment ease', score_1_to_5: 4, evidence: {} },
      { canonical_name: 'learning_curve', display_label: 'Learning curve', score_1_to_5: 3, evidence: {} },
      { canonical_name: 'curl_shape_naturalness', display_label: 'Curl shape naturalness', score_1_to_5: 4, evidence: {} },
    ],
  },
  {
    record_id: 'pqd_d12fa0',
    product_id: 'prod_bime_heated_142',
    product_name: 'Bime Beauty Heated Eyelash Curler',
    brand: 'Bime Beauty',
    creator_id: 'creator_hoodedeyebeauty',
    verdict: 'negative',
    transcript: [],
    visual_observations: [],
    facial_cues: [],
    attributes: [
      { canonical_name: 'eye_shape_compatibility', display_label: 'Eye-shape compatibility', score_1_to_5: 2, evidence: {} },
      { canonical_name: 'alignment_ease', display_label: 'Alignment ease', score_1_to_5: 2, evidence: {} },
      { canonical_name: 'curl_hold_duration', display_label: 'Curl hold duration', score_1_to_5: 4, evidence: {} },
      { canonical_name: 'heat_evenness', display_label: 'Heat evenness', score_1_to_5: 4, evidence: {} },
    ],
  },
  {
    record_id: 'pqd_5e0b34',
    product_id: 'prod_bime_heated_142',
    product_name: 'Bime Beauty Heated Eyelash Curler',
    brand: 'Bime Beauty',
    creator_id: 'creator_beautytoolnerd',
    verdict: 'positive',
    transcript: [],
    visual_observations: [],
    facial_cues: [],
    attributes: [
      { canonical_name: 'curl_hold_duration', display_label: 'Curl hold duration', score_1_to_5: 5, evidence: {} },
      { canonical_name: 'lash_pinch_safety', display_label: 'Lash pinch safety', score_1_to_5: 5, evidence: {} },
      { canonical_name: 'learning_curve', display_label: 'Learning curve', score_1_to_5: 3, evidence: {} },
      { canonical_name: 'heat_evenness', display_label: 'Heat evenness', score_1_to_5: 4, evidence: {} },
      { canonical_name: 'curl_shape_naturalness', display_label: 'Curl shape naturalness', score_1_to_5: 4, evidence: {} },
    ],
  },
  {
    record_id: 'pqd_4f8d22',
    product_id: 'prod_bime_heated_142',
    product_name: 'Bime Beauty Heated Eyelash Curler',
    brand: 'Bime Beauty',
    creator_id: 'creator_lashtechgrad',
    verdict: 'positive',
    transcript: [],
    visual_observations: [],
    facial_cues: [],
    attributes: [
      { canonical_name: 'curl_hold_duration', display_label: 'Curl hold duration', score_1_to_5: 5, evidence: {} },
      { canonical_name: 'heat_evenness', display_label: 'Heat evenness', score_1_to_5: 5, evidence: {} },
      { canonical_name: 'learning_curve', display_label: 'Learning curve', score_1_to_5: 5, evidence: {} },
      { canonical_name: 'lash_pinch_safety', display_label: 'Lash pinch safety', score_1_to_5: 5, evidence: {} },
      { canonical_name: 'alignment_ease', display_label: 'Alignment ease', score_1_to_5: 5, evidence: {} },
      { canonical_name: 'case_quality', display_label: 'Case / dock quality', score_1_to_5: 3, evidence: {} },
    ],
  },

  // ----- Tweezerman Classic ---------------------------------------------
  {
    record_id: 'pqd_a44e90',
    product_id: 'prod_tweezerman_classic_001',
    product_name: 'Tweezerman Classic Eyelash Curler',
    brand: 'Tweezerman',
    creator_id: 'creator_brushandlash',
    verdict: 'positive',
    transcript: [],
    visual_observations: [],
    facial_cues: [],
    attributes: [
      { canonical_name: 'curl_hold_duration', display_label: 'Curl hold duration', score_1_to_5: 2, evidence: {} },
      { canonical_name: 'alignment_ease', display_label: 'Alignment ease', score_1_to_5: 5, evidence: {} },
      { canonical_name: 'learning_curve', display_label: 'Learning curve', score_1_to_5: 5, evidence: {} },
      { canonical_name: 'lash_pinch_safety', display_label: 'Lash pinch safety', score_1_to_5: 4, evidence: {} },
    ],
  },
  {
    record_id: 'pqd_61e0b8',
    product_id: 'prod_tweezerman_classic_001',
    product_name: 'Tweezerman Classic Eyelash Curler',
    brand: 'Tweezerman',
    creator_id: 'creator_curlandhold',
    verdict: 'negative',
    transcript: [],
    visual_observations: [],
    facial_cues: [],
    attributes: [
      { canonical_name: 'curl_hold_duration', display_label: 'Curl hold duration', score_1_to_5: 1, evidence: {} },
      { canonical_name: 'learning_curve', display_label: 'Learning curve', score_1_to_5: 5, evidence: {} },
      { canonical_name: 'alignment_ease', display_label: 'Alignment ease', score_1_to_5: 5, evidence: {} },
      { canonical_name: 'lash_pinch_safety', display_label: 'Lash pinch safety', score_1_to_5: 4, evidence: {} },
    ],
  },
  {
    record_id: 'pqd_7c2349',
    product_id: 'prod_tweezerman_classic_001',
    product_name: 'Tweezerman Classic Eyelash Curler',
    brand: 'Tweezerman',
    creator_id: 'creator_minimalmakeupgirl',
    verdict: 'negative',
    transcript: [],
    visual_observations: [],
    facial_cues: [],
    attributes: [
      { canonical_name: 'eye_shape_compatibility', display_label: 'Eye-shape compatibility', score_1_to_5: 2, evidence: {} },
      { canonical_name: 'alignment_ease', display_label: 'Alignment ease', score_1_to_5: 2, evidence: {} },
      { canonical_name: 'curl_hold_duration', display_label: 'Curl hold duration', score_1_to_5: 3, evidence: {} },
      { canonical_name: 'learning_curve', display_label: 'Learning curve', score_1_to_5: 3, evidence: {} },
    ],
  },

  // ----- Shiseido --------------------------------------------------------
  {
    record_id: 'pqd_b3a071',
    product_id: 'prod_shiseido_curler_001',
    product_name: 'Shiseido Eyelash Curler',
    brand: 'Shiseido',
    creator_id: 'creator_themuabar',
    verdict: 'positive',
    transcript: [],
    visual_observations: [],
    facial_cues: [],
    attributes: [
      { canonical_name: 'eye_shape_compatibility', display_label: 'Eye-shape compatibility', score_1_to_5: 5, evidence: {} },
      { canonical_name: 'alignment_ease', display_label: 'Alignment ease', score_1_to_5: 5, evidence: {} },
      { canonical_name: 'learning_curve', display_label: 'Learning curve', score_1_to_5: 5, evidence: {} },
      { canonical_name: 'curl_hold_duration', display_label: 'Curl hold duration', score_1_to_5: 3, evidence: {} },
      { canonical_name: 'lash_pinch_safety', display_label: 'Lash pinch safety', score_1_to_5: 5, evidence: {} },
    ],
  },
  {
    record_id: 'pqd_c01f88',
    product_id: 'prod_shiseido_curler_001',
    product_name: 'Shiseido Eyelash Curler',
    brand: 'Shiseido',
    creator_id: 'creator_lashjourney',
    verdict: 'positive',
    transcript: [],
    visual_observations: [],
    facial_cues: [],
    attributes: [
      { canonical_name: 'eye_shape_compatibility', display_label: 'Eye-shape compatibility', score_1_to_5: 3, evidence: {} },
      { canonical_name: 'alignment_ease', display_label: 'Alignment ease', score_1_to_5: 3, evidence: {} },
      { canonical_name: 'lash_pinch_safety', display_label: 'Lash pinch safety', score_1_to_5: 5, evidence: {} },
      { canonical_name: 'learning_curve', display_label: 'Learning curve', score_1_to_5: 4, evidence: {} },
      { canonical_name: 'curl_hold_duration', display_label: 'Curl hold duration', score_1_to_5: 3, evidence: {} },
    ],
  },

  // ----- GrandeLASH ------------------------------------------------------
  {
    record_id: 'pqd_e2c544',
    product_id: 'prod_grandelash_heated_001',
    product_name: 'GrandeLASH Heated Curler',
    brand: 'Grande Cosmetics',
    creator_id: 'creator_cleanmakeupcollective',
    verdict: 'negative',
    transcript: [],
    visual_observations: [],
    facial_cues: [],
    attributes: [
      { canonical_name: 'heat_evenness', display_label: 'Heat evenness', score_1_to_5: 2, evidence: {} },
      { canonical_name: 'curl_hold_duration', display_label: 'Curl hold duration', score_1_to_5: 3, evidence: {} },
      { canonical_name: 'lash_pinch_safety', display_label: 'Lash pinch safety', score_1_to_5: 4, evidence: {} },
      { canonical_name: 'learning_curve', display_label: 'Learning curve', score_1_to_5: 4, evidence: {} },
      { canonical_name: 'weight_in_hand', display_label: 'Weight in hand', score_1_to_5: 2, evidence: {} },
    ],
  },
  {
    record_id: 'pqd_f81d29',
    product_id: 'prod_grandelash_heated_001',
    product_name: 'GrandeLASH Heated Curler',
    brand: 'Grande Cosmetics',
    creator_id: 'creator_hoodedeyebeauty',
    verdict: 'positive',
    transcript: [],
    visual_observations: [],
    facial_cues: [],
    attributes: [
      { canonical_name: 'eye_shape_compatibility', display_label: 'Eye-shape compatibility', score_1_to_5: 5, evidence: {} },
      { canonical_name: 'alignment_ease', display_label: 'Alignment ease', score_1_to_5: 5, evidence: {} },
      { canonical_name: 'heat_evenness', display_label: 'Heat evenness', score_1_to_5: 4, evidence: {} },
      { canonical_name: 'curl_hold_duration', display_label: 'Curl hold duration', score_1_to_5: 4, evidence: {} },
    ],
  },
]

// ---- Discovered category schema -----------------------------------------
// Stage-6 output: the top 8 induced attributes for the eyelash-curler
// category, plus a tail of 3 candidates that didn't survive the cutoff. The
// three signals (recurrence / discrimination / sentiment correlation) are
// blended into `importance_score`; entries are sorted by importance_score.
export const EYELASH_CURLER_SCHEMA: CategorySchema = {
  category: 'eyelash curlers',
  schema_version: 'v3',
  maturity: 'developing',
  total_records: PER_VIDEO_EXTRACTIONS.length,
  generated_at: '2026-05-11',
  attributes: [
    {
      rank: 1,
      canonical_name: 'curl_hold_duration',
      display_label: 'Curl hold duration',
      recurrence_pct: 100,
      discrimination: 0.85,
      sentiment_correlation: 0.78,
      importance_score: 0.91,
      in_top_schema: true,
    },
    {
      rank: 2,
      canonical_name: 'heat_evenness',
      display_label: 'Heat evenness',
      recurrence_pct: 58,
      discrimination: 0.78,
      sentiment_correlation: 0.71,
      importance_score: 0.74,
      in_top_schema: true,
    },
    {
      rank: 3,
      canonical_name: 'eye_shape_compatibility',
      display_label: 'Eye-shape compatibility',
      recurrence_pct: 42,
      discrimination: 0.81,
      sentiment_correlation: 0.62,
      importance_score: 0.69,
      in_top_schema: true,
    },
    {
      rank: 4,
      canonical_name: 'learning_curve',
      display_label: 'Learning curve',
      recurrence_pct: 83,
      discrimination: 0.42,
      sentiment_correlation: 0.55,
      importance_score: 0.65,
      in_top_schema: true,
    },
    {
      rank: 5,
      canonical_name: 'alignment_ease',
      display_label: 'Alignment ease',
      recurrence_pct: 67,
      discrimination: 0.71,
      sentiment_correlation: 0.58,
      importance_score: 0.63,
      in_top_schema: true,
    },
    {
      rank: 6,
      canonical_name: 'lash_pinch_safety',
      display_label: 'Lash pinch safety',
      recurrence_pct: 67,
      discrimination: 0.32,
      sentiment_correlation: 0.48,
      importance_score: 0.52,
      in_top_schema: true,
    },
    {
      rank: 7,
      canonical_name: 'curl_shape_naturalness',
      display_label: 'Curl shape naturalness',
      recurrence_pct: 25,
      discrimination: 0.45,
      sentiment_correlation: 0.51,
      importance_score: 0.46,
      in_top_schema: true,
    },
    {
      rank: 8,
      canonical_name: 'battery_life',
      display_label: 'Battery / charge life',
      recurrence_pct: 25,
      discrimination: 0.55,
      sentiment_correlation: 0.42,
      importance_score: 0.42,
      in_top_schema: true,
    },
    // ----- Tail (didn't make the cut) ----
    {
      rank: 9,
      canonical_name: 'weight_in_hand',
      display_label: 'Weight in hand',
      recurrence_pct: 17,
      discrimination: 0.08,
      sentiment_correlation: 0.12,
      importance_score: 0.11,
      in_top_schema: false,
    },
    {
      rank: 10,
      canonical_name: 'case_quality',
      display_label: 'Case / dock quality',
      recurrence_pct: 8,
      discrimination: 0.02,
      sentiment_correlation: 0.05,
      importance_score: 0.04,
      in_top_schema: false,
    },
    {
      rank: 11,
      canonical_name: 'packaging_aesthetic',
      display_label: 'Packaging aesthetic',
      recurrence_pct: 33,
      discrimination: 0.04,
      sentiment_correlation: -0.02,
      importance_score: 0.03,
      in_top_schema: false,
    },
  ],
}

// ---- Product scorecards -------------------------------------------------
// Stage-7 output: each product re-scored against the standardized top-8
// schema. `status: 'demonstrated'` = score derived from explicit evidence;
// `inferred` = derived from visual/contextual signal (lower confidence);
// `not_demonstrated` = no record speaks to this attribute (null score).
// These two are intentionally different — see the pipeline doc, step 6.
export const PRODUCT_SCORECARDS: ProductScorecard[] = [
  {
    product_id: 'prod_bime_heated_142',
    product_name: 'Bime Beauty Heated Eyelash Curler',
    brand: 'Bime Beauty',
    total_records: 5,
    cells: [
      { attribute_canonical: 'curl_hold_duration', score_1_to_5: 4.8, confidence: 0.94, sample_size: 5, status: 'demonstrated' },
      { attribute_canonical: 'heat_evenness', score_1_to_5: 4.2, confidence: 0.88, sample_size: 5, status: 'demonstrated' },
      { attribute_canonical: 'eye_shape_compatibility', score_1_to_5: 3.4, confidence: 0.72, sample_size: 4, status: 'demonstrated' },
      { attribute_canonical: 'learning_curve', score_1_to_5: 4.0, confidence: 0.81, sample_size: 4, status: 'demonstrated' },
      { attribute_canonical: 'alignment_ease', score_1_to_5: 4.0, confidence: 0.75, sample_size: 3, status: 'demonstrated' },
      { attribute_canonical: 'lash_pinch_safety', score_1_to_5: 5.0, confidence: 0.82, sample_size: 3, status: 'demonstrated' },
      { attribute_canonical: 'curl_shape_naturalness', score_1_to_5: 4.3, confidence: 0.68, sample_size: 3, status: 'demonstrated' },
      { attribute_canonical: 'battery_life', score_1_to_5: 3.8, confidence: 0.42, sample_size: 2, status: 'inferred' },
    ],
  },
  {
    product_id: 'prod_tweezerman_classic_001',
    product_name: 'Tweezerman Classic Eyelash Curler',
    brand: 'Tweezerman',
    total_records: 3,
    cells: [
      { attribute_canonical: 'curl_hold_duration', score_1_to_5: 2.0, confidence: 0.91, sample_size: 3, status: 'demonstrated' },
      { attribute_canonical: 'heat_evenness', score_1_to_5: null, confidence: 0, sample_size: 0, status: 'not_demonstrated' },
      { attribute_canonical: 'eye_shape_compatibility', score_1_to_5: 2.0, confidence: 0.55, sample_size: 1, status: 'demonstrated' },
      { attribute_canonical: 'learning_curve', score_1_to_5: 4.3, confidence: 0.85, sample_size: 3, status: 'demonstrated' },
      { attribute_canonical: 'alignment_ease', score_1_to_5: 4.0, confidence: 0.78, sample_size: 3, status: 'demonstrated' },
      { attribute_canonical: 'lash_pinch_safety', score_1_to_5: 4.0, confidence: 0.72, sample_size: 2, status: 'demonstrated' },
      { attribute_canonical: 'curl_shape_naturalness', score_1_to_5: 3.5, confidence: 0.38, sample_size: 0, status: 'inferred' },
      { attribute_canonical: 'battery_life', score_1_to_5: null, confidence: 0, sample_size: 0, status: 'not_demonstrated' },
    ],
  },
  {
    product_id: 'prod_shiseido_curler_001',
    product_name: 'Shiseido Eyelash Curler',
    brand: 'Shiseido',
    total_records: 2,
    cells: [
      { attribute_canonical: 'curl_hold_duration', score_1_to_5: 3.0, confidence: 0.65, sample_size: 2, status: 'demonstrated' },
      { attribute_canonical: 'heat_evenness', score_1_to_5: null, confidence: 0, sample_size: 0, status: 'not_demonstrated' },
      { attribute_canonical: 'eye_shape_compatibility', score_1_to_5: 4.0, confidence: 0.75, sample_size: 2, status: 'demonstrated' },
      { attribute_canonical: 'learning_curve', score_1_to_5: 4.5, confidence: 0.68, sample_size: 2, status: 'demonstrated' },
      { attribute_canonical: 'alignment_ease', score_1_to_5: 4.0, confidence: 0.65, sample_size: 2, status: 'demonstrated' },
      { attribute_canonical: 'lash_pinch_safety', score_1_to_5: 5.0, confidence: 0.72, sample_size: 2, status: 'demonstrated' },
      { attribute_canonical: 'curl_shape_naturalness', score_1_to_5: null, confidence: 0, sample_size: 0, status: 'not_demonstrated' },
      { attribute_canonical: 'battery_life', score_1_to_5: null, confidence: 0, sample_size: 0, status: 'not_demonstrated' },
    ],
  },
  {
    product_id: 'prod_grandelash_heated_001',
    product_name: 'GrandeLASH Heated Curler',
    brand: 'Grande Cosmetics',
    total_records: 2,
    cells: [
      { attribute_canonical: 'curl_hold_duration', score_1_to_5: 3.5, confidence: 0.62, sample_size: 2, status: 'demonstrated' },
      { attribute_canonical: 'heat_evenness', score_1_to_5: 3.0, confidence: 0.65, sample_size: 2, status: 'demonstrated' },
      { attribute_canonical: 'eye_shape_compatibility', score_1_to_5: 5.0, confidence: 0.55, sample_size: 1, status: 'demonstrated' },
      { attribute_canonical: 'learning_curve', score_1_to_5: 4.0, confidence: 0.65, sample_size: 2, status: 'demonstrated' },
      { attribute_canonical: 'alignment_ease', score_1_to_5: 5.0, confidence: 0.55, sample_size: 1, status: 'demonstrated' },
      { attribute_canonical: 'lash_pinch_safety', score_1_to_5: 4.0, confidence: 0.52, sample_size: 1, status: 'demonstrated' },
      { attribute_canonical: 'curl_shape_naturalness', score_1_to_5: null, confidence: 0, sample_size: 0, status: 'not_demonstrated' },
      { attribute_canonical: 'battery_life', score_1_to_5: 3.2, confidence: 0.38, sample_size: 1, status: 'inferred' },
    ],
  },
]

export const RUFUS_WITH_GIFTLY: RufusResponse = {
  thread: [
    {
      speaker: 'user',
      text: 'best eyelash curler that holds all day',
    },
    {
      speaker: 'rufus',
      text:
        "Looking at how real people respond when they're not being paid to post:",
      bullets: [
        {
          title: 'Bime Beauty Heated Eyelash Curler',
          body:
            'Stands out clearly — 81% of creators who received it without any obligation to post chose to post about it organically, and the most common feedback specifically mentioned curl that held through a full day, which matches what you\'re asking for.',
        },
        {
          title: 'Tweezerman Classic (regular curler)',
          body:
            'Has more Amazon reviews, but only 27% of unpaid creators chose to post about it, and the most common reason for not posting was "curl drops out by lunch."',
        },
      ],
      recommendation: {
        product: 'Bime Beauty Heated Eyelash Curler',
        priceUsd: 49,
        rationale:
          'Based on independent, unpaid evaluation rather than ad-incentivized reviews.',
      },
    },
  ],
}
