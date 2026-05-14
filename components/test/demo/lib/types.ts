export type Brand = {
  id: string
  name: string
  founded: number
  category: string
  segment: string
  logoUrl: string
}

export type Product = {
  id: string
  brandId: string
  name: string
  tagline: string
  imageUrl: string
  retailPriceUsd: number
  ingredients: string[]
  commissionPct: number
  status: string
}

export type Creator = {
  id: string
  handle: string
  displayName: string
  followers: number
  followersLabel: string
  city: string
  niche: string
  avatarUrl: string
  fitScore: number
  reasons: { short: string; long: string }[]
}

export type InProgressStage =
  | 'approved'
  | 'shipped'
  | 'delivered'
  | 'awaiting-reaction'
  | 'posted'

export type Match = {
  id: string
  creatorId: string
  productId: string
  stage: InProgressStage
  stageLabel: string
  detail: string
}

export type Offer = {
  id: string
  brandName: string
  brandLogoUrl: string
  productName: string
  productImageUrl: string
  commissionPct: number
  whyMatched: string
}

export type GiftStatus = 'delivered' | 'in-transit' | 'awaiting-reaction'

export type ActiveGift = {
  id: string
  brandName: string
  productName: string
  productImageUrl: string
  status: GiftStatus
  deliveredDaysAgo: number
}

export type FeedbackChoice = 'love' | 'pass' | 'still-trying'

export type ActiveGiftFeedback = {
  choice: FeedbackChoice
  declineReasons?: string[]
  declineNote?: string
  postUrl?: string
  contentType?: string
  scheduledDate?: string
} | null

export type ProductSummary = {
  id: string
  name: string
  isFeatured: boolean
  postRate: number
  postCountText: string
  avgSentiment: number
  conversionPct: number
  topThemeLabel: string
  topThemeQuote: string
}

export type AmazonProduct = {
  id: string
  title: string
  imageUrl: string
  rating: number
  reviewCount: number
  priceUsd: number
  prime: boolean
  sponsored?: boolean
  isFeatured?: boolean
  flagged?: boolean
}

export type RufusMessage = {
  speaker: 'user' | 'rufus'
  text: string
  bullets?: { title: string; body: string }[]
  reviewQuote?: string
  recommendation?: { product: string; priceUsd: number; rationale: string }
}

export type RufusResponse = {
  thread: RufusMessage[]
}

export type RufusMode = 'without' | 'with'

export type DataViewMode = 'extractions' | 'schema' | 'matrix'

// ---- Pipeline raw streams (stage-3 outputs) ------------------------------
export type TranscriptSegment = {
  ts: string // mm:ss
  ts_seconds: number
  text: string
}

export type VisualObservation = {
  ts: string
  ts_seconds: number
  observation: string
}

export type FacialCue = {
  ts: string
  ts_seconds: number
  inferred_state: string
}

// ---- Per-video extraction (stage-4 output) -------------------------------
export type ExtractedAttribute = {
  canonical_name: string
  display_label: string
  score_1_to_5: number
  evidence: {
    transcript?: { ts: string; quote: string }
    visual?: { ts: string; quote: string }
    facial?: { ts: string; cue: string }
  }
}

export type PerVideoExtraction = {
  record_id: string
  product_id: string
  product_name: string
  brand: string
  creator_id: string
  verdict: RecordVerdict
  // Populated for the hero video; empty arrays for the rest. The data view
  // surfaces an "extraction-only" badge when these are empty.
  transcript: TranscriptSegment[]
  visual_observations: VisualObservation[]
  facial_cues: FacialCue[]
  attributes: ExtractedAttribute[]
}

// ---- Discovered category schema (stage-6 output) -------------------------
export type SchemaAttribute = {
  rank: number
  canonical_name: string
  display_label: string
  recurrence_pct: number // 0–100
  discrimination: number // 0–1 normalized variance across products
  sentiment_correlation: number // -1 to 1
  importance_score: number // 0–1 blended ranking score
  in_top_schema: boolean // true for the top-N cutoff
}

export type CategorySchema = {
  category: string
  schema_version: string
  maturity: 'immature' | 'developing' | 'mature'
  total_records: number
  generated_at: string
  attributes: SchemaAttribute[]
}

// ---- Product scorecard (stage-7 output) ----------------------------------
export type ScorecardStatus = 'demonstrated' | 'inferred' | 'not_demonstrated'

export type ScorecardCell = {
  attribute_canonical: string
  score_1_to_5: number | null
  confidence: number // 0–1
  sample_size: number
  status: ScorecardStatus
}

export type ProductScorecard = {
  product_id: string
  product_name: string
  brand: string
  total_records: number
  cells: ScorecardCell[]
}

// ---- Pipeline tab state --------------------------------------------------
export type PipelineStageId =
  | 'raw-capture'
  | 'channel-split'
  | 'corpus'
  | 'schema-discovery'
  | 'product-rescoring'

// ---- Product Quality Data (the platform's own data type)
// Reframed around Garvin's quality dimensions (Harvard Business Review, 1987).
// Each record carries six scored dimensions — performance, reliability,
// durability, sensory, ease_of_use, value — plus the comparison verdicts and
// a short summary. Standardized fields across products so a downstream agent
// can aggregate, compare, or filter by dimension or attribute.
export type ClaimVerdict = 'exceeded' | 'met' | 'fell_short'
export type ComparisonVerdict = 'better' | 'similar' | 'worse'
export type EyeShape =
  | 'almond'
  | 'round'
  | 'hooded'
  | 'monolid'
  | 'downturned'
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'pro'

export type RecordVerdict = 'positive' | 'negative'

export type ProductQualityRecord = {
  record_id: string
  captured_at: string
  verdict: RecordVerdict
  product: {
    id: string
    brand: string
    name: string
    category: string
    price_usd: number
    stated_claims: string[]
  }
  creator: {
    id: string
    follower_count: number
    niche: string
    relevant_attributes: {
      eye_shape: EyeShape
      skill_level: SkillLevel
      use_context: string
    }
    comparison_set: string[]
  }
  video_signals: {
    video_duration_sec: number
    product_use_window_sec: number
    attempts_to_succeed: number
    observable_issues: string[]
    context: {
      paired_with: string[]
      lighting: 'natural_daylight' | 'ring_light' | 'mixed_indoor'
      environment: string
    }
  }
  quality_dimensions: {
    performance: {
      score_1_to_5: number
      vs_creator_expectation: ClaimVerdict
      vs_brand_claims: ClaimVerdict
      evidence: string
    }
    reliability: {
      score_1_to_5: number
      consistency_notes: string
      evidence: string
    }
    durability: {
      score_1_to_5: number
      build_quality_notes: string
      concerns: string
    }
    sensory: {
      score_1_to_5: number
      look: string
      feel: string
      ergonomics: string
    }
    ease_of_use: {
      score_1_to_5: number
      friction_points: string[]
      evidence: string
    }
    value: {
      score_1_to_5: number
      price_tier: string
      would_repurchase_at_price: boolean
      notes: string
    }
  }
  comparisons: {
    vs_product: string
    verdict: ComparisonVerdict
    stronger_on: string[]
    weaker_on: string[]
  }[]
  summary: {
    best_for: string
    not_for: string
    standout_quality: string
    biggest_weakness: string
  }
}
