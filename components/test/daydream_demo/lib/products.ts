import type {
  ConsumerCard,
  CreatorVideo,
  EnrichedProduct,
  QualityDimensions,
} from './types'

// Five short loops shared across all video tiles. Committed to public/.
const LOOPS = [
  '/daydream-demo/videos/loop-1.mp4',
  '/daydream-demo/videos/loop-2.mp4',
  '/daydream-demo/videos/loop-3.mp4',
  '/daydream-demo/videos/loop-4.mp4',
  '/daydream-demo/videos/loop-5.mp4',
] as const

const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=600&auto=format&fit=crop&q=80`

const thumb = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=280&auto=format&fit=crop&q=80`

function video(
  handle: string,
  platform: 'tiktok' | 'instagram',
  thumbnailId: string,
  loopIndex: number
): CreatorVideo {
  return {
    handle,
    platform,
    thumbnail_url: thumb(thumbnailId),
    video_url: LOOPS[loopIndex % LOOPS.length],
  }
}

function quality(
  d: number,
  f: number,
  a: number,
  pv: number,
  eu: number
): QualityDimensions {
  return {
    durability: d,
    fit: f,
    aesthetics: a,
    perceived_value: pv,
    ease_of_use: eu,
  }
}

// Brand-prominence default order (1 = first card with signal OFF).
// Household names appear first; niche brands appear last.
// Sorted-by-post_rate order moves 9 of 10 cards — well above the ≥4 minimum.
export const PRODUCTS: EnrichedProduct[] = [
  // ─── default_rank 1 ───────────────────────────────────────────
  {
    product_id: 'p_rl_polo_dress',
    brand: 'Ralph Lauren',
    name: 'Polo Cotton Shirtdress',
    description:
      'Iconic cotton shirtdress with a relaxed silhouette, mother-of-pearl buttons, and a notched collar. Cut for an everyday weekend fit.',
    price: 248,
    image_url: img('1625158244856-e5e20f733c1f'),
    style_tags: ['summer', 'dress', 'shirtdress', 'classic', 'cotton'],
    vector_embedding_id: 'vec_8a3f1c2b9e7d4a01',
    product_match_key: 'ralph-lauren__polo-cotton-shirtdress',
    created_at: '2026-01-14T09:12:00Z',
    default_rank: 1,
    signal: {
      product_match_key: 'ralph-lauren__polo-cotton-shirtdress',
      post_rate: 0.41,
      sample_size: 31,
      quality_dimensions: quality(4.6, 4.0, 3.8, 4.1, 4.5),
      match_confidence: 0.97,
      first_seeded_at: '2026-03-02T00:00:00Z',
      last_updated_at: '2026-05-11T07:30:00Z',
      creator_videos: [
        video('@daniellecade', 'instagram', '1515886657613-9f3515b0c78f', 0),
        video('@laurenphilo', 'tiktok', '1495121553079-4c61bcce1894', 1),
        video('@hello.molly', 'instagram', '1517841905240-472988babdf9', 2),
      ],
    },
  },

  // ─── default_rank 2 ───────────────────────────────────────────
  {
    product_id: 'p_jcrew_liv_linen',
    brand: 'J.Crew',
    name: "Liv Linen Midi Dress",
    description:
      'Breezy belted linen midi with a tie waist and side pockets. Lightweight enough for a humid afternoon, structured enough for dinner.',
    price: 148,
    image_url: img('1747396206869-75ea57b325ce'),
    style_tags: ['summer', 'dress', 'linen', 'midi', 'belted'],
    vector_embedding_id: 'vec_2f7b1d3a4c9e8a02',
    product_match_key: 'jcrew__liv-linen-midi-dress',
    created_at: '2026-02-01T11:40:00Z',
    default_rank: 2,
    signal: {
      product_match_key: 'jcrew__liv-linen-midi-dress',
      post_rate: 0.55,
      sample_size: 24,
      quality_dimensions: quality(4.3, 4.4, 4.2, 4.5, 4.6),
      match_confidence: 0.96,
      first_seeded_at: '2026-03-08T00:00:00Z',
      last_updated_at: '2026-05-10T18:45:00Z',
      creator_videos: [
        video('@hannah.runs', 'tiktok', '1469334031218-e382a71b716b', 3),
        video('@emily.knit', 'instagram', '1581338834647-b0fb40704e21', 4),
        video('@city.fit.daily', 'tiktok', '1503342217505-b0a15ec3261c', 0),
      ],
    },
  },

  // ─── default_rank 3 ───────────────────────────────────────────
  {
    product_id: 'p_uniqlo_lc_flared',
    brand: 'Uniqlo',
    name: 'Linen-Cotton Flared Long Dress',
    description:
      'Easy-fitting linen-cotton blend with a flared hem. Quick-drying, machine-washable, holds its shape without ironing.',
    price: 49.9,
    image_url: img('1592980187697-2708eafe9c81'),
    style_tags: ['summer', 'dress', 'linen-cotton', 'flared', 'machine-wash'],
    vector_embedding_id: 'vec_5e8c2a1f9b3d7c03',
    product_match_key: 'uniqlo__linen-cotton-flared-long-dress',
    created_at: '2026-02-12T08:22:00Z',
    default_rank: 3,
    signal: {
      product_match_key: 'uniqlo__linen-cotton-flared-long-dress',
      post_rate: 0.62,
      sample_size: 28,
      quality_dimensions: quality(4.2, 4.5, 4.0, 4.8, 4.7),
      match_confidence: 0.99,
      first_seeded_at: '2026-03-15T00:00:00Z',
      last_updated_at: '2026-05-11T05:15:00Z',
      creator_videos: [
        video('@minimalmiri', 'instagram', '1525507119028-ed4c629a60a3', 1),
        video('@kate.commutes', 'tiktok', '1485125639709-a60c3a500bf1', 2),
        video('@everyday.lin', 'instagram', '1542838132-92c53300491e', 3),
      ],
    },
  },

  // ─── default_rank 4 ───────────────────────────────────────────
  {
    product_id: 'p_givenchy_voyou',
    brand: 'Givenchy',
    name: 'Voyou Cotton Poplin Dress',
    description:
      'Tailored cotton poplin with a defined waist and structured shoulder. Signature 4G hardware at the cuffs.',
    price: 1290,
    image_url: img('1528813569347-f16dd076e347'),
    style_tags: ['summer', 'dress', 'poplin', 'tailored', 'luxury'],
    vector_embedding_id: 'vec_9c1a4f7b2e8d5c04',
    product_match_key: 'givenchy__voyou-cotton-poplin-dress',
    created_at: '2026-01-22T13:55:00Z',
    default_rank: 4,
    signal: {
      product_match_key: 'givenchy__voyou-cotton-poplin-dress',
      post_rate: 0.58,
      sample_size: 18,
      quality_dimensions: quality(4.7, 4.6, 4.9, 3.9, 4.3),
      match_confidence: 0.81,
      first_seeded_at: '2026-03-22T00:00:00Z',
      last_updated_at: '2026-05-09T20:10:00Z',
      creator_videos: [
        video('@aria.demure', 'instagram', '1539109136881-3be0616acf4b', 4),
        video('@nina.elles', 'instagram', '1487412947147-5cebf100ffc2', 0),
        video('@runway.diary', 'tiktok', '1488161628813-04466f872be2', 1),
      ],
    },
  },

  // ─── default_rank 5 ───────────────────────────────────────────
  {
    product_id: 'p_khaite_italo',
    brand: 'Khaite',
    name: 'Italo Silk Slip Dress',
    description:
      'Bias-cut silk slip with delicate French seams and an asymmetric hem. Drapes like liquid; reads dressed-up or dressed-down.',
    price: 1690,
    image_url: img('1599309329365-0a9ed45a1da3'),
    style_tags: ['summer', 'dress', 'silk', 'slip', 'bias-cut'],
    vector_embedding_id: 'vec_3b6e9d2a4f1c7b05',
    product_match_key: 'khaite__italo-silk-slip-dress',
    created_at: '2026-01-08T15:30:00Z',
    default_rank: 5,
    signal: {
      product_match_key: 'khaite__italo-silk-slip-dress',
      post_rate: 0.84,
      sample_size: 32,
      quality_dimensions: quality(4.4, 4.7, 4.9, 4.2, 4.1),
      match_confidence: 0.99,
      first_seeded_at: '2026-02-18T00:00:00Z',
      last_updated_at: '2026-05-11T09:00:00Z',
      creator_videos: [
        video('@noor.atelier', 'instagram', '1483985988355-763728e1935b', 2),
        video('@silkroutes', 'tiktok', '1554412933-514a83d2f3c8', 3),
        video('@mariko.jpn', 'instagram', '1492106087820-71f1a00d2b11', 4),
        video('@ines.par', 'tiktok', '1469334031218-e382a71b716b', 0),
      ],
    },
  },

  // ─── default_rank 6 ───────────────────────────────────────────
  {
    product_id: 'p_im_lyzia',
    brand: 'Isabel Marant',
    name: 'Lyzia Ruffled Cotton Dress',
    description:
      'Lightweight cotton with a tiered ruffled hem and smocked bodice. Cut for an A-line silhouette; drawstring at the neckline.',
    price: 890,
    image_url: img('1602303894456-398ce544d90b'),
    style_tags: ['summer', 'dress', 'ruffled', 'boho', 'cotton'],
    vector_embedding_id: 'vec_7d4c8a2e5b9f3d06',
    product_match_key: 'isabel-marant__lyzia-ruffled-cotton-dress',
    created_at: '2026-01-29T10:18:00Z',
    default_rank: 6,
    signal: {
      product_match_key: 'isabel-marant__lyzia-ruffled-cotton-dress',
      post_rate: 0.72,
      sample_size: 21,
      quality_dimensions: quality(4.0, 4.3, 4.7, 4.0, 4.4),
      match_confidence: 0.78,
      first_seeded_at: '2026-03-05T00:00:00Z',
      last_updated_at: '2026-05-10T11:22:00Z',
      creator_videos: [
        video('@boho.bea', 'instagram', '1581338834647-b0fb40704e21', 1),
        video('@thrift.travel', 'tiktok', '1502716119720-b23a93e5fe1b', 2),
        video('@une.fille', 'instagram', '1495121553079-4c61bcce1894', 3),
      ],
    },
  },

  // ─── default_rank 7 ───────────────────────────────────────────
  {
    product_id: 'p_alo_tieback_midi',
    brand: 'alo',
    name: 'Tied-Back Midi Dress',
    description:
      'Soft modal jersey with an open tied back and a built-in shelf bra. Designed for transitional days that go from studio to dinner.',
    price: 138,
    image_url: img('1562292817-58d294c3a7e3'),
    style_tags: ['summer', 'dress', 'modal', 'midi', 'athleisure'],
    vector_embedding_id: 'vec_1f8e3a7b4d2c9e07',
    product_match_key: 'alo__tied-back-midi-dress',
    created_at: '2026-02-20T14:05:00Z',
    default_rank: 7,
    signal: {
      product_match_key: 'alo__tied-back-midi-dress',
      post_rate: 0.78,
      sample_size: 26,
      quality_dimensions: quality(4.3, 4.6, 4.5, 4.4, 4.8),
      match_confidence: 0.95,
      first_seeded_at: '2026-03-28T00:00:00Z',
      last_updated_at: '2026-05-11T06:50:00Z',
      creator_videos: [
        video('@coresoulflow', 'instagram', '1518611012118-696072aa579a', 4),
        video('@yoga.evenings', 'tiktok', '1530021232320-687d8e3dba54', 0),
        video('@daily.flow', 'instagram', '1517841905240-472988babdf9', 1),
        video('@studio.to.dinner', 'tiktok', '1542838132-92c53300491e', 2),
      ],
    },
  },

  // ─── default_rank 8 ───────────────────────────────────────────
  {
    product_id: 'p_staud_wells',
    brand: 'Staud',
    name: 'Wells Poplin Mini Dress',
    description:
      'Crisp cotton poplin with a smocked waist and balloon sleeves. Cut just above the knee; reads playful but polished.',
    price: 395,
    image_url: img('1618814509419-e61b0434ae97'),
    style_tags: ['summer', 'dress', 'poplin', 'mini', 'smocked'],
    vector_embedding_id: 'vec_6a2d9c4f1e7b8d08',
    product_match_key: 'staud__wells-poplin-mini-dress',
    created_at: '2026-02-04T12:00:00Z',
    default_rank: 8,
    signal: {
      product_match_key: 'staud__wells-poplin-mini-dress',
      post_rate: 0.76,
      sample_size: 19,
      quality_dimensions: quality(4.1, 4.4, 4.8, 4.3, 4.5),
      match_confidence: 0.86,
      first_seeded_at: '2026-03-12T00:00:00Z',
      last_updated_at: '2026-05-09T16:40:00Z',
      creator_videos: [
        video('@playful.poplin', 'instagram', '1487412947147-5cebf100ffc2', 3),
        video('@sundress.szn', 'tiktok', '1488161628813-04466f872be2', 4),
        video('@brunch.brigade', 'instagram', '1502716119720-b23a93e5fe1b', 0),
      ],
    },
  },

  // ─── default_rank 9 ───────────────────────────────────────────
  {
    product_id: 'p_fd_margaret',
    brand: 'Favorite Daughter',
    name: 'The Margaret Cotton Dress',
    description:
      'Sleeveless A-line in heavyweight cotton with a tailored bodice and hidden side zipper. Sits at the knee.',
    price: 268,
    image_url: img('1618814523809-8b181370e747'),
    style_tags: ['summer', 'dress', 'cotton', 'a-line', 'sleeveless'],
    vector_embedding_id: 'vec_4c1b7e9d2a8f5c09',
    product_match_key: 'favorite-daughter__the-margaret-cotton-dress',
    created_at: '2026-02-26T09:48:00Z',
    default_rank: 9,
    signal: {
      product_match_key: 'favorite-daughter__the-margaret-cotton-dress',
      post_rate: 0.81,
      sample_size: 22,
      quality_dimensions: quality(4.2, 4.7, 4.6, 4.5, 4.6),
      match_confidence: 0.83,
      first_seeded_at: '2026-04-02T00:00:00Z',
      last_updated_at: '2026-05-11T08:20:00Z',
      creator_videos: [
        video('@meghans.dispatch', 'instagram', '1525507119028-ed4c629a60a3', 1),
        video('@blair.jcrewish', 'tiktok', '1554412933-514a83d2f3c8', 2),
        video('@nyc.summer.diary', 'instagram', '1503342217505-b0a15ec3261c', 3),
      ],
    },
  },

  // ─── default_rank 10 — UNMATCHED (signal = null) ─────────────
  {
    product_id: 'p_nilil_lyana',
    brand: 'Nili Lotan',
    name: 'Lyana Cotton Voile Dress',
    description:
      'Hand-finished cotton voile with French seams and pleated front detailing. Sheer at the sleeves; lined through the bodice.',
    price: 695,
    image_url: img('1764298493197-a1c1cce57800'),
    style_tags: ['summer', 'dress', 'voile', 'pleated', 'quiet-luxury'],
    vector_embedding_id: 'vec_8b5d3f1c2e9a4b10',
    product_match_key: 'nili-lotan__lyana-cotton-voile-dress',
    created_at: '2026-02-14T17:25:00Z',
    default_rank: 10,
    signal: null,
  },
]

// Sanity-check invariants at module load so a future edit can't silently
// break the demo's internal consistency contract.
if (process.env.NODE_ENV !== 'production') {
  if (PRODUCTS.length !== 10) {
    throw new Error('PRODUCTS must contain exactly 10 entries')
  }
  const nullSignals = PRODUCTS.filter((p) => p.signal === null)
  if (nullSignals.length !== 1) {
    throw new Error('Exactly 1 product must have signal=null')
  }
  const ranks = PRODUCTS.map((p) => p.default_rank).sort((a, b) => a - b)
  if (ranks.join(',') !== '1,2,3,4,5,6,7,8,9,10') {
    throw new Error('default_rank must be a permutation of 1..10')
  }
}

export function rankedByDefault(): EnrichedProduct[] {
  return [...PRODUCTS].sort((a, b) => a.default_rank - b.default_rank)
}

export function rankedBySignal(): EnrichedProduct[] {
  return [...PRODUCTS].sort((a, b) => {
    const ar = a.signal?.post_rate ?? -Infinity
    const br = b.signal?.post_rate ?? -Infinity
    return br - ar
  })
}

// Daydream's "without Giftly" picks for the same humid-NY query.
// Designed to read as a generic AI-shopping result: synthetics that cling,
// two jumpsuits (user typed "dress" — model returned the wrong thing), two
// denim pieces (wrong fabric for humidity), and a few evening/satin cocktail
// dresses that ignore the "for a day" framing. None of these are creator-
// validated for humid weather; the contrast vs. PRODUCTS is the pitch.
export const DAYDREAM_DEFAULT_PICKS: ConsumerCard[] = [
  {
    product_id: 'dd_lulu_wunder',
    brand: 'Lululemon',
    name: 'Wunder Train Bodycon Tank Dress',
    price: 128,
    image_url: img('1763750784315-e35f75ef1f2a'),
  },
  {
    product_id: 'dd_zara_sequin',
    brand: 'ZARA',
    name: 'Limited Edition Sequin Mini',
    price: 59,
    image_url: img('1765229276405-4136eb5f8555'),
  },
  {
    product_id: 'dd_allsaints_hera',
    brand: 'AllSaints',
    name: 'Hera Satin Slip Dress',
    price: 295,
    image_url: img('1765278248747-632a1f60fbab'),
  },
  {
    product_id: 'dd_cos_denim_midi',
    brand: 'COS',
    name: 'Asymmetric Denim Midi',
    price: 135,
    image_url: img('1760692558250-09303b4df7fe'),
  },
  {
    product_id: 'dd_mango_jumpsuit',
    brand: 'Mango',
    name: 'Linen-Blend Wide-Leg Jumpsuit',
    price: 99,
    image_url: img('1768982596945-97c5aa2be5d0'),
  },
  {
    product_id: 'dd_reformation_lupita',
    brand: 'Reformation',
    name: 'Lupita Jumpsuit',
    price: 248,
    image_url: img('1495385794356-15371f348c31'),
  },
  {
    product_id: 'dd_freepeople_adella',
    brand: 'Free People',
    name: 'Adella Denim Maxi',
    price: 148,
    image_url: img('1741943716275-2eaf11f4e918'),
  },
  {
    product_id: 'dd_anthro_maeve',
    brand: 'Anthropologie',
    name: 'Maeve Ribbed Midi',
    price: 138,
    image_url: img('1650603695506-b1ed40c000a9'),
  },
  {
    product_id: 'dd_asos_edition',
    brand: 'ASOS Edition',
    name: 'Sequined Cocktail Mini',
    price: 96,
    image_url: img('1642808636475-61be81966dee'),
  },
  {
    product_id: 'dd_madewell_charmeuse',
    brand: 'Madewell',
    name: 'Slip Dress in Silk Charmeuse',
    price: 158,
    image_url: img('1765229279658-7335ee3cdaf5'),
  },
]

export function toConsumerCard(p: EnrichedProduct): ConsumerCard {
  return {
    product_id: p.product_id,
    brand: p.brand,
    name: p.name,
    price: p.price,
    image_url: p.image_url,
  }
}

export const GIFTLY_PICKS: ConsumerCard[] = PRODUCTS.map(toConsumerCard)

if (process.env.NODE_ENV !== 'production') {
  if (DAYDREAM_DEFAULT_PICKS.length !== 10) {
    throw new Error('DAYDREAM_DEFAULT_PICKS must contain exactly 10 entries')
  }
  const ids = new Set(DAYDREAM_DEFAULT_PICKS.map((c) => c.product_id))
  if (ids.size !== 10) {
    throw new Error('DAYDREAM_DEFAULT_PICKS product_ids must be unique')
  }
}
