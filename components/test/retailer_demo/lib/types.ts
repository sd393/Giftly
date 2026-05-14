export type Variant = 'baseline' | 'signal'

export type StreamStatus =
  | 'idle'
  | 'thinking'
  | 'streaming'
  | 'done'
  | 'error'

export type Seller = {
  domain: string
  price: number
  in_stock: boolean
  ships_from: string
  shipping: string
}

export type Attestation = {
  creator_id: string
  authority: number
  use_duration_days: number
  verdict: string
  note: string
}

export type GiftlySignal = {
  attestation_count: number
  unique_creators: number
  signal_score: number
  top_use_cases: string[]
  sample_attestations: Attestation[]
}

export type Product = {
  brand: string
  name: string
  category: string
  size: string
  certifications: string[]
  aggregate_rating: number
  sellers: Seller[]
  giftly_signal: GiftlySignal
}
