import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/server'

import { ActivityTimeline } from '../../_components/activity-timeline'
import { BrandEditForm } from '../_components/brand-edit-form'
import { BrandNotes } from '../_components/brand-notes'
import { BrandStageSelect } from '../_components/brand-stage-select'
import { BrandStatusActions } from '../_components/brand-status-actions'

export default async function BrandDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: brand, error }, { data: messages }, { data: tasks }] =
    await Promise.all([
      supabase.from('brands').select('*').eq('id', id).maybeSingle(),
      supabase
        .from('outbound_messages')
        .select('id, channel, direction, subject, body, sender_account, status, sent_at, created_by')
        .eq('entity_type', 'brand')
        .eq('entity_id', id)
        .order('sent_at', { ascending: false })
        .limit(100),
      supabase
        .from('outbound_tasks')
        .select('id, title, description, status, due_at, owner_id, completed_at, created_at')
        .eq('entity_type', 'brand')
        .eq('entity_id', id)
        .order('created_at', { ascending: false })
        .limit(100),
    ])

  if (error) {
    return (
      <div className="px-6 md:px-10 py-8">
        <p className="text-[0.9rem] text-coral-deep">
          Failed to load brand: {error.message}
        </p>
      </div>
    )
  }
  if (!brand) notFound()

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1100px]">
      <div className="flex items-center gap-2 text-[0.8rem] text-muted-warm mb-2">
        <Link href="/brands" className="hover:text-ink">
          brands
        </Link>
        <span>/</span>
        <span className="text-ink">{brand.brand_name}</span>
      </div>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-[2rem] tracking-tight">
            {brand.brand_name}
          </h1>
          <p className="mt-1 text-[0.85rem] text-muted-warm">
            <a
              href={`https://${brand.website}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-ink"
            >
              {brand.website}
            </a>
            {brand.archived_at ? (
              <Badge variant="outline" className="ml-2 text-[0.65rem]">
                archived
              </Badge>
            ) : null}
            {!brand.archived_at && brand.reviewed_at ? (
              <Badge variant="secondary" className="ml-2 text-[0.65rem]">
                reviewed
              </Badge>
            ) : null}
            {!brand.archived_at && !brand.reviewed_at ? (
              <Badge className="ml-2 text-[0.65rem]">new</Badge>
            ) : null}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <BrandStageSelect id={brand.id} initial={brand.stage} />
          <BrandStatusActions
            id={brand.id}
            reviewed={Boolean(brand.reviewed_at)}
            archived={Boolean(brand.archived_at)}
          />
        </div>
      </div>

      <section className="mb-8">
        <h2 className="text-[0.75rem] uppercase tracking-[0.15em] text-muted-warm font-medium mb-3">
          details
        </h2>
        <div className="bg-white border border-line/60 rounded-md p-5">
          <BrandEditForm brand={brand} />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-[0.75rem] uppercase tracking-[0.15em] text-muted-warm font-medium mb-3">
          notes
        </h2>
        <BrandNotes id={brand.id} initial={brand.notes ?? ''} />
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
          createdAt={brand.created_at}
          messages={messages ?? []}
          tasks={tasks ?? []}
        />
      </section>
    </div>
  )
}
