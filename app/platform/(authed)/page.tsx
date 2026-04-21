import { createClient } from '@/lib/supabase/server'

import { PageHeader } from './_components/page-header'
import { InboundList, type InboundItem } from './_components/inbound-list'

export default async function InboundPage() {
  const supabase = await createClient()
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [creatorsRes, brandsRes] = await Promise.all([
    supabase
      .from('creators')
      .select(
        'id, name, email, platform, followers, niches, product_interests, created_at'
      )
      .is('reviewed_at', null)
      .is('archived_at', null)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('brands')
      .select(
        'id, brand_name, website, category, contact_name, contact_email, product_description, created_at'
      )
      .is('reviewed_at', null)
      .is('archived_at', null)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const items: InboundItem[] = [
    ...(creatorsRes.data ?? []).map(
      (c): InboundItem => ({
        kind: 'creator',
        id: c.id,
        title: c.name,
        subtitle: c.email,
        summary: creatorSummary(c),
        createdAt: c.created_at,
      })
    ),
    ...(brandsRes.data ?? []).map(
      (b): InboundItem => ({
        kind: 'brand',
        id: b.id,
        title: b.brand_name,
        subtitle: b.website,
        summary: brandSummary(b),
        createdAt: b.created_at,
      })
    ),
  ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

  const loadError = creatorsRes.error ?? brandsRes.error

  return (
    <div className="px-6 md:px-10 py-8">
      <PageHeader
        title="inbound"
        subtitle={
          items.length === 0
            ? 'no new submissions in the last 30 days'
            : `${items.length} unreviewed · last 30 days`
        }
      />

      {loadError ? (
        <p className="mt-6 text-[0.9rem] text-coral-deep">
          Failed to load: {loadError.message}
        </p>
      ) : (
        <div className="mt-6">
          <InboundList items={items} />
        </div>
      )}
    </div>
  )
}

function creatorSummary(c: {
  platform: string | null
  followers: string | null
  niches: string[]
  product_interests: string | null
}): string {
  const bits: string[] = []
  if (c.followers && c.platform) bits.push(`${c.followers} on ${c.platform}`)
  else if (c.followers) bits.push(c.followers)
  else if (c.platform) bits.push(c.platform)
  if (c.niches && c.niches.length > 0) bits.push(c.niches.slice(0, 3).join(', '))
  if (bits.length === 0 && c.product_interests) {
    bits.push(truncate(c.product_interests, 80))
  }
  return bits.join(' · ') || 'creator'
}

function brandSummary(b: {
  category: string | null
  product_description: string | null
}): string {
  const bits: string[] = []
  if (b.category) bits.push(`${b.category} brand`)
  if (b.product_description) bits.push(truncate(b.product_description, 100))
  return bits.join(' · ') || 'brand'
}

function truncate(s: string, n: number): string {
  const clean = s.replace(/\s+/g, ' ').trim()
  return clean.length > n ? clean.slice(0, n - 1).trimEnd() + '…' : clean
}
