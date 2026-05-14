export type Brand =
  | 'Khaite'
  | 'Isabel Marant'
  | 'J.Crew'
  | 'Ralph Lauren'
  | 'Uniqlo'
  | 'alo'
  | 'Staud'
  | 'Nili Lotan'
  | 'Favorite Daughter'
  | 'Givenchy'

export type CatalogRecord = {
  product_id: string
  brand: Brand
  name: string
  description: string
  price: number
  image_url: string
  style_tags: string[]
  vector_embedding_id: string
  product_match_key: string
  created_at: string
}

export type QualityDimensions = {
  durability: number
  fit: number
  aesthetics: number
  perceived_value: number
  ease_of_use: number
}

export type CreatorVideo = {
  handle: string
  platform: 'tiktok' | 'instagram'
  thumbnail_url: string
  video_url: string
}

export type GiftlySignal = {
  product_match_key: string
  post_rate: number
  sample_size: number
  quality_dimensions: QualityDimensions
  match_confidence: number
  first_seeded_at: string
  last_updated_at: string
  creator_videos: CreatorVideo[]
}

export type EnrichedProduct = CatalogRecord & {
  default_rank: number
  signal: GiftlySignal | null
}

export type MatchRow = {
  giftly_product: { brand: Brand; name: string; thumbnail_url: string }
  daydream_product: {
    brand: Brand
    name: string
    thumbnail_url: string
  } | null
  confidence: number
  status: 'matched' | 'below_threshold'
}

export type DataTab = 'schema' | 'matching' | 'detail'

// Narrow display shape for cards on the consumer view. Brand is a free-form
// string here because the Daydream-default set uses brands outside Giftly's
// 10-partner pool (Lululemon, ZARA, etc.).
export type ConsumerCard = {
  product_id: string
  brand: string
  name: string
  price: number
  image_url: string
}
