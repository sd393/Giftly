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

export type MatchOutcome =
  | 'posted-positive'
  | 'posted-with-caveats'
  | 'accepted-no-post'
  | 'declined-at-offer'

export type MatchRow = {
  id: string
  date: string
  brand: string
  product: string
  creatorHandle: string
  audienceLabel: string
  fitScore: number
  outcome: MatchOutcome
  detail: string
  postUrl?: string
}

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

export type DataViewMode = 'rows' | 'product-summary'
