import { createClient } from '@/lib/supabase/server'

import { PageHeader } from '../_components/page-header'
import { InTalksList, type InTalksBrand } from './_components/in-talks-list'
import { LogMessageDialog } from './_components/log-message-dialog'
import {
  MessagesFilters,
  type MessagesQuery,
} from './_components/messages-filters'
import { MessagesTable, type MessageRow } from './_components/messages-table'

type SearchParams = {
  channel?: string
  status?: string
  direction?: string
  by?: 'user' | 'agent'
  since?: '7d' | '30d' | '90d' | 'all'
}

export default async function OutboundPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const since = params.since ?? '30d'
  const channel = params.channel ?? ''
  const status = params.status ?? ''
  const direction = params.direction ?? ''
  const by = params.by ?? ''

  const supabase = await createClient()

  let query = supabase
    .from('outbound_messages')
    .select(
      'id, entity_type, entity_id, channel, direction, subject, body, sender_account, status, sent_at, created_by, created_by_id, external_id, metadata'
    )

  if (since !== 'all') {
    const days = since === '7d' ? 7 : since === '90d' ? 90 : 30
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    query = query.gte('sent_at', cutoff)
  }
  if (channel) query = query.ilike('channel', channel)
  if (status) query = query.eq('status', status as never)
  if (direction) query = query.eq('direction', direction as never)
  if (by === 'user' || by === 'agent') query = query.eq('created_by', by)

  const { data: messages, error } = await query
    .order('sent_at', { ascending: false })
    .limit(500)

  // In-talks brands live independently of the filters — they're the
  // priority strip at the top. We surface the most recent inbound/replied
  // message per brand so the card can show "last reply Xd ago".
  const { data: inTalksBrandRows } = await supabase
    .from('brands')
    .select('id, brand_name, website')
    .eq('stage', 'in_talks')
    .is('archived_at', null)
    .order('updated_at', { ascending: false })
    .limit(50)

  const inTalksBrands: InTalksBrand[] = []
  if (inTalksBrandRows && inTalksBrandRows.length > 0) {
    const ids = inTalksBrandRows.map((b) => b.id)
    const { data: lastReplies } = await supabase
      .from('outbound_messages')
      .select('entity_id, direction, status, sent_at')
      .eq('entity_type', 'brand')
      .in('entity_id', ids)
      .or('direction.eq.inbound,status.eq.replied')
      .order('sent_at', { ascending: false })
      .limit(500)

    const latestByBrand = new Map<string, string>()
    for (const m of lastReplies ?? []) {
      if (!latestByBrand.has(m.entity_id)) {
        latestByBrand.set(m.entity_id, m.sent_at)
      }
    }

    for (const b of inTalksBrandRows) {
      inTalksBrands.push({
        id: b.id,
        brand_name: b.brand_name,
        website: b.website,
        last_reply_at: latestByBrand.get(b.id) ?? null,
      })
    }

    inTalksBrands.sort((a, b) => {
      const av = a.last_reply_at ?? ''
      const bv = b.last_reply_at ?? ''
      if (av === bv) return 0
      return av < bv ? 1 : -1
    })
  }

  const creatorIds = new Set<string>()
  const brandIds = new Set<string>()
  for (const m of messages ?? []) {
    if (m.entity_type === 'creator') creatorIds.add(m.entity_id)
    else if (m.entity_type === 'brand') brandIds.add(m.entity_id)
  }

  const [{ data: creators }, { data: brands }] = await Promise.all([
    creatorIds.size > 0
      ? supabase
          .from('creators')
          .select('id, name')
          .in('id', Array.from(creatorIds))
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    brandIds.size > 0
      ? supabase
          .from('brands')
          .select('id, brand_name')
          .in('id', Array.from(brandIds))
      : Promise.resolve(
          { data: [] as { id: string; brand_name: string }[] }
        ),
  ])

  const entityNames = new Map<string, string>()
  for (const c of creators ?? []) entityNames.set(`creator:${c.id}`, c.name)
  for (const b of brands ?? []) entityNames.set(`brand:${b.id}`, b.brand_name)

  const distinctChannels = Array.from(
    new Set((messages ?? []).map((m) => m.channel))
  ).sort()

  const rows: MessageRow[] = (messages ?? []).map((m) => ({
    id: m.id,
    entityType: m.entity_type,
    entityId: m.entity_id,
    entityName:
      entityNames.get(`${m.entity_type}:${m.entity_id}`) ?? '(deleted)',
    channel: m.channel,
    direction: m.direction,
    subject: m.subject,
    body: m.body,
    senderAccount: m.sender_account,
    status: m.status,
    sentAt: m.sent_at,
    createdBy: m.created_by,
    externalId: m.external_id,
    metadata: m.metadata,
  }))

  const activeFilters: MessagesQuery = {
    channel,
    status,
    direction,
    by: by as '' | 'user' | 'agent',
    since,
  }

  return (
    <div className="px-6 md:px-10 py-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <PageHeader
          title="outbound"
          subtitle="every message sent to brands + creators"
        />
        <LogMessageDialog />
      </div>

      <InTalksList brands={inTalksBrands} />

      {error ? (
        <p className="text-[0.9rem] text-coral-deep">
          Failed to load messages: {error.message}
        </p>
      ) : (
        <>
          <MessagesFilters
            query={activeFilters}
            availableChannels={distinctChannels}
          />
          <p className="mt-2 mb-4 text-[0.75rem] text-muted-warm">
            {rows.length} message{rows.length === 1 ? '' : 's'}
          </p>
          <MessagesTable rows={rows} />
        </>
      )}
    </div>
  )
}
