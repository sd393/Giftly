import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/server'

import { CreatorEditForm } from '../_components/creator-edit-form'
import { CreatorNotes } from '../_components/creator-notes'
import { CreatorStatusActions } from '../_components/creator-status-actions'
import { ActivityTimeline } from '../../_components/activity-timeline'

export default async function CreatorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: creator, error }, { data: messages }, { data: tasks }] =
    await Promise.all([
      supabase.from('creators').select('*').eq('id', id).maybeSingle(),
      supabase
        .from('outbound_messages')
        .select('id, channel, direction, subject, body, sender_account, status, sent_at, created_by')
        .eq('entity_type', 'creator')
        .eq('entity_id', id)
        .order('sent_at', { ascending: false })
        .limit(100),
      supabase
        .from('outbound_tasks')
        .select('id, title, description, status, due_at, owner_id, completed_at, created_at')
        .eq('entity_type', 'creator')
        .eq('entity_id', id)
        .order('created_at', { ascending: false })
        .limit(100),
    ])

  if (error) {
    return (
      <div className="px-6 md:px-10 py-8">
        <p className="text-[0.9rem] text-coral-deep">
          Failed to load creator: {error.message}
        </p>
      </div>
    )
  }
  if (!creator) notFound()

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1100px]">
      <div className="flex items-center gap-2 text-[0.8rem] text-muted-warm mb-2">
        <Link href="/creators" className="hover:text-ink">
          creators
        </Link>
        <span>/</span>
        <span className="text-ink">{creator.name}</span>
      </div>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-[2rem] tracking-tight">
            {creator.name}
          </h1>
          <p className="mt-1 text-[0.85rem] text-muted-warm">
            {creator.email}
            {creator.archived_at ? (
              <Badge variant="outline" className="ml-2 text-[0.65rem]">
                archived
              </Badge>
            ) : null}
            {!creator.archived_at && creator.reviewed_at ? (
              <Badge variant="secondary" className="ml-2 text-[0.65rem]">
                reviewed
              </Badge>
            ) : null}
            {!creator.archived_at && !creator.reviewed_at ? (
              <Badge className="ml-2 text-[0.65rem]">new</Badge>
            ) : null}
          </p>
        </div>
        <CreatorStatusActions
          id={creator.id}
          reviewed={Boolean(creator.reviewed_at)}
          archived={Boolean(creator.archived_at)}
        />
      </div>

      <section className="mb-8">
        <h2 className="text-[0.75rem] uppercase tracking-[0.15em] text-muted-warm font-medium mb-3">
          details
        </h2>
        <div className="bg-white border border-line/60 rounded-md p-5">
          <CreatorEditForm creator={creator} />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-[0.75rem] uppercase tracking-[0.15em] text-muted-warm font-medium mb-3">
          notes
        </h2>
        <CreatorNotes id={creator.id} initial={creator.notes ?? ''} />
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[0.75rem] uppercase tracking-[0.15em] text-muted-warm font-medium">
            activity
          </h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled>
              + log message
            </Button>
            <Button size="sm" variant="outline" disabled>
              + add task
            </Button>
          </div>
        </div>
        <ActivityTimeline
          createdAt={creator.created_at}
          messages={messages ?? []}
          tasks={tasks ?? []}
        />
      </section>
    </div>
  )
}
