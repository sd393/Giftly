import Link from 'next/link'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { BRAND_STAGES, type BrandStage } from '@/lib/schemas/brand'
import { createClient } from '@/lib/supabase/server'

import { PageHeader } from '../_components/page-header'
import { BrandsFilters } from './_components/brands-filters'
import { BrandsTable } from './_components/brands-table'

type SortField = 'brand_name' | 'created_at' | 'updated_at'

type SearchParams = {
  q?: string
  category?: string
  stage?: string
  sort?: SortField
  dir?: 'asc' | 'desc'
  show?: 'active' | 'archived' | 'all'
}

const STAGE_SET = new Set<string>(BRAND_STAGES)

const VALID_SORT: Record<SortField, true> = {
  brand_name: true,
  created_at: true,
  updated_at: true,
}

export default async function BrandsDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const q = sp.q?.trim() ?? ''
  const category = sp.category?.trim() ?? ''
  const stage: BrandStage | '' =
    sp.stage && STAGE_SET.has(sp.stage) ? (sp.stage as BrandStage) : ''
  const sort: SortField = sp.sort && VALID_SORT[sp.sort] ? sp.sort : 'created_at'
  const dir: 'asc' | 'desc' = sp.dir === 'asc' ? 'asc' : 'desc'
  const show: 'active' | 'archived' | 'all' =
    sp.show === 'archived' || sp.show === 'all' ? sp.show : 'active'

  const supabase = await createClient()

  let query = supabase
    .from('brands')
    .select(
      'id, brand_name, website, category, contact_name, contact_email, owner_id, stage, reviewed_at, archived_at, created_at, updated_at'
    )

  if (show === 'active') query = query.is('archived_at', null)
  else if (show === 'archived') query = query.not('archived_at', 'is', null)

  if (stage) query = query.eq('stage', stage)
  if (category) query = query.ilike('category', category)

  if (q) {
    const esc = q.replace(/[%_]/g, (m) => `\\${m}`)
    const like = `%${esc}%`
    query = query.or(
      `brand_name.ilike.${like},website.ilike.${like},contact_name.ilike.${like},contact_email.ilike.${like},category.ilike.${like},product_description.ilike.${like},notes.ilike.${like}`
    )
  }

  query = query.order(sort, { ascending: dir === 'asc' })

  const { data: rows, error } = await query.limit(500)

  const distinctCategories = Array.from(
    new Set((rows ?? []).map((r) => r.category).filter(Boolean) as string[])
  ).sort()

  return (
    <div className="px-6 md:px-10 py-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <PageHeader
          title="brands"
          subtitle={`${rows?.length ?? 0} ${show === 'active' ? 'active' : show === 'archived' ? 'archived' : 'total'}`}
        />
        <Button asChild size="sm">
          <Link href="/brands/new">
            <Plus aria-hidden />
            new brand
          </Link>
        </Button>
      </div>

      <BrandsFilters
        q={q}
        category={category}
        stage={stage}
        sort={sort}
        dir={dir}
        show={show}
        categories={distinctCategories}
      />

      {error ? (
        <p className="mt-6 text-[0.9rem] text-coral-deep">
          Failed to load brands: {error.message}
        </p>
      ) : (
        <BrandsTable
          rows={rows ?? []}
          sort={sort}
          dir={dir}
          currentParams={sp}
        />
      )}
    </div>
  )
}
