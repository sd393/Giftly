import { redirect } from 'next/navigation'

import { getCreatorForCurrentUser } from '@/lib/portal/auth'
import { createClient } from '@/lib/supabase/server'

import { PortalTabs, type PortalMatch } from './_components/portal-tabs'

const ACTIVE_STAGES = [
  'accepted',
  'shipped',
  'received',
  'still_trying',
  'eval_submitted',
  'eval_complete',
]

export default async function CreatorPortalPage() {
  const creator = await getCreatorForCurrentUser()
  if (!creator) redirect('/login')

  const supabase = await createClient()
  const { data: matches } = await supabase
    .from('matches')
    .select(
      `id, stage, why_matched, commission_pct, proposed_at,
       shipped_at, tracking_number, tracking_carrier,
       product:products(id, name, image_url, retail_price_cents,
                       brand:brands(id, brand_name))`,
    )
    .eq('creator_id', creator.id)
    .order('proposed_at', { ascending: false })

  const allMatches: PortalMatch[] = (matches ?? []) as PortalMatch[]
  const inbox = allMatches.filter((m) => m.stage === 'proposed')
  const active = allMatches.filter((m) => ACTIVE_STAGES.includes(m.stage))

  const firstName = (creator.name ?? '').split(' ')[0] ?? ''

  return (
    <>
      <header className="mb-6">
        <p className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-warm font-medium">
          creator portal
        </p>
        <h1 className="font-display text-[1.75rem] tracking-tight mt-1">
          hey {firstName.toLowerCase() || 'there'}
        </h1>
        <p className="mt-1 text-[0.85rem] text-muted-warm">
          {inbox.length} new offer{inbox.length === 1 ? '' : 's'} ·{' '}
          {active.length} active gift{active.length === 1 ? '' : 's'}
        </p>
      </header>
      <PortalTabs inbox={inbox} active={active} />
    </>
  )
}
