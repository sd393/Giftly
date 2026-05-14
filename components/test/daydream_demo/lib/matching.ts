import { PRODUCTS } from './products'
import type { MatchRow } from './types'

// Six high-confidence exact matches, three medium-confidence fuzzy matches
// where a variant/color differs, and one below-threshold failed match.
// Indexed by product_id so the unmatched row matches the product whose
// signal is null in products.ts (internal consistency contract).
const HIGH = new Set([
  'p_rl_polo_dress',
  'p_jcrew_liv_linen',
  'p_uniqlo_lc_flared',
  'p_khaite_italo',
  'p_alo_tieback_midi',
  'p_fd_margaret',
])

const FUZZY: Record<string, { confidence: number; variant: string }> = {
  p_givenchy_voyou: { confidence: 0.81, variant: 'in ivory' },
  p_im_lyzia: { confidence: 0.78, variant: 'in floral print' },
  p_staud_wells: { confidence: 0.86, variant: 'in pink stripe' },
}

const BELOW_THRESHOLD_ID = 'p_nilil_lyana'

export const MATCH_ROWS: MatchRow[] = PRODUCTS.map((p) => {
  if (p.product_id === BELOW_THRESHOLD_ID) {
    return {
      giftly_product: {
        brand: p.brand,
        name: p.name,
        thumbnail_url: p.image_url,
      },
      daydream_product: null,
      confidence: 0.42,
      status: 'below_threshold',
    }
  }
  if (HIGH.has(p.product_id)) {
    return {
      giftly_product: {
        brand: p.brand,
        name: p.name,
        thumbnail_url: p.image_url,
      },
      daydream_product: {
        brand: p.brand,
        name: p.name,
        thumbnail_url: p.image_url,
      },
      // Spread the 6 high-confidence values across 0.94–0.99 deterministically
      confidence: Math.round((0.94 + (p.default_rank % 6) * 0.01) * 100) / 100,
      status: 'matched',
    }
  }
  const fuzzy = FUZZY[p.product_id]
  if (!fuzzy) {
    throw new Error(`Unclassified product in matching.ts: ${p.product_id}`)
  }
  return {
    giftly_product: {
      brand: p.brand,
      name: `${p.name} ${fuzzy.variant}`,
      thumbnail_url: p.image_url,
    },
    daydream_product: {
      brand: p.brand,
      name: p.name,
      thumbnail_url: p.image_url,
    },
    confidence: fuzzy.confidence,
    status: 'matched',
  }
})

if (process.env.NODE_ENV !== 'production') {
  if (MATCH_ROWS.length !== 10) {
    throw new Error('MATCH_ROWS must contain exactly 10 entries')
  }
  const failed = MATCH_ROWS.filter((r) => r.status === 'below_threshold')
  if (failed.length !== 1) {
    throw new Error('Exactly 1 row must be below_threshold')
  }
  const high = MATCH_ROWS.filter(
    (r) => r.status === 'matched' && r.confidence >= 0.94
  )
  if (high.length !== 6) {
    throw new Error(
      `Expected 6 high-confidence (≥0.94) rows, found ${high.length}`
    )
  }
  const fuzzy = MATCH_ROWS.filter(
    (r) =>
      r.status === 'matched' && r.confidence >= 0.7 && r.confidence < 0.94
  )
  if (fuzzy.length !== 3) {
    throw new Error(`Expected 3 fuzzy rows (0.70–0.94), found ${fuzzy.length}`)
  }
}

export const MATCH_STATS = {
  total: MATCH_ROWS.length,
  matched: MATCH_ROWS.filter((r) => r.status === 'matched').length,
  matchRatePct: Math.round(
    (MATCH_ROWS.filter((r) => r.status === 'matched').length /
      MATCH_ROWS.length) *
      100
  ),
}
