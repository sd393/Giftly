import Link from 'next/link'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'

import { PageHeader } from '../_components/page-header'
import { CreatorsFilters } from './_components/creators-filters'
import { CreatorsTable } from './_components/creators-table'

type SortField = 'name' | 'created_at' | 'updated_at'

type SearchParams = {
  q?: string
  platform?: string
  niche?: string
  sort?: SortField
  dir?: 'asc' | 'desc'
  show?: 'active' | 'archived' | 'all'
}

const VALID_SORT: Record<SortField, true> = {
  name: true,
  created_at: true,
  updated_at: true,
}

export default async function CreatorsDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const q = sp.q?.trim() ?? ''
  const platform = sp.platform?.trim() ?? ''
  const niche = sp.niche?.trim() ?? ''
  const sort: SortField = sp.sort && VALID_SORT[sp.sort] ? sp.sort : 'created_at'
  const dir: 'asc' | 'desc' = sp.dir === 'asc' ? 'asc' : 'desc'
  const show: 'active' | 'archived' | 'all' =
    sp.show === 'archived' || sp.show === 'all' ? sp.show : 'active'

  const supabase = await createClient()

  let query = supabase
    .from('creators')
    .select(
      'id, name, email, platform, followers, niches, owner_id, reviewed_at, archived_at, created_at, updated_at'
    )

  if (show === 'active') query = query.is('archived_at', null)
  else if (show === 'archived') query = query.not('archived_at', 'is', null)

  // Hide pipeline-discovered prospects (IG DM recipients, etc.). They live
  // on /outbound until they sign up or we manually promote them.
  query = query.neq('source', 'outreach')

  if (platform) query = query.ilike('platform', platform)
  if (niche) query = query.contains('niches', [niche])

  if (q) {
    const esc = q.replace(/[%_]/g, (m) => `\\${m}`)
    const like = `%${esc}%`
    query = query.or(
      `name.ilike.${like},email.ilike.${like},social_handles.ilike.${like},product_interests.ilike.${like},notes.ilike.${like}`
    )
  }

  query = query.order(sort, { ascending: dir === 'asc' })

  const { data: rows, error } = await query.limit(500)

  const distinctPlatforms = Array.from(
    new Set((rows ?? []).map((r) => r.platform).filter(Boolean) as string[])
  ).sort()
  const distinctNiches = Array.from(
    new Set((rows ?? []).flatMap((r) => r.niches ?? []))
  ).sort()

  return (
    <div className="px-6 md:px-10 py-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <PageHeader
          title="creators"
          subtitle={`${rows?.length ?? 0} ${show === 'active' ? 'active' : show === 'archived' ? 'archived' : 'total'}`}
        />
        <Button asChild size="sm">
          <Link href="/creators/new">
            <Plus aria-hidden />
            new creator
          </Link>
        </Button>
      </div>

      <CreatorsFilters
        q={q}
        platform={platform}
        niche={niche}
        sort={sort}
        dir={dir}
        show={show}
        platforms={distinctPlatforms}
        niches={distinctNiches}
      />

      {error ? (
        <p className="mt-6 text-[0.9rem] text-coral-deep">
          Failed to load creators: {error.message}
        </p>
      ) : (
        <CreatorsTable rows={rows ?? []} />
      )}
    </div>
  )
}
