export type UcpView = 'baseline' | 'enriched'

export type Attestation = {
  creator_id: string
  creator_authority: number
  use_duration_days: number
  verdict: 'preferred' | 'neutral' | 'rejected'
  tagged_use_cases: string[]
  evidence: {
    before_after_photos: number
    video_demonstration: boolean
    ingredient_review: boolean
    comparative_test: boolean
  }
  note: string
}

export type GiftlyEnrichment = {
  schema_version: string
  attached_to: 'variant'
  seller_domain: string
  signal_score: number
  signal_decile: string
  attestation_count: number
  unique_creators: number
  top_use_cases: string[]
  verdict_distribution: {
    preferred: number
    neutral: number
    rejected: number
  }
  evidence_completeness: number
  last_attestation_received: string
  sample_attestations: Attestation[]
}

export type ConsumerNoticeType =
  | 'legal_disclaimer'
  | 'safety_warning'
  | 'prop_65'

export type ConsumerNotice = {
  type: ConsumerNoticeType
  message: string
}

export type Sku = {
  // Display data (used by ProductHero)
  id: string
  handle: string
  brand: string
  name: string
  size: string
  rating: number
  reviewCount: number
  priceCents: number
  imageSrc: string
  imageUrl: string
  productUrl: string
  description: string
  whyWeLoveIt: string[]
  groveValues: string[]
  category: string
  sku: string
  freeShippingThreshold: number
  subscribeRewardRate: number
  buyOnceRewardRate: number
  // Searchable tags (mix of taste, hair-type, certifications). Surface
  // as `Product.tags` in the UCP feed.
  tags: string[]
  // UCP eligibility / compliance — submitted to Google Merchant Center
  // (Merchant API custom attributes). These gate whether the product
  // surfaces in UCP checkout at all.
  nativeCommerce: boolean
  merchantItemId: string
  consumerNotice?: ConsumerNotice
  returnPolicyLabel: string
  // Giftly preference-signal enrichment, attached to the variant via
  // `variants[].metadata["co.giftly.preference_signals"]`.
  giftly: GiftlyEnrichment
}
