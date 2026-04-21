'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BRAND_STAGES, type BrandStage } from '@/lib/schemas/brand'

type Props = {
  q: string
  category: string
  stage: BrandStage | ''
  sort: string
  dir: 'asc' | 'desc'
  show: 'active' | 'archived' | 'all'
  categories: string[]
}

const STAGE_LABELS: Record<BrandStage, string> = {
  cold: 'cold',
  in_talks: 'in talks',
  done: 'done',
}

export function BrandsFilters({
  q,
  category,
  stage,
  sort,
  dir,
  show,
  categories,
}: Props) {
  const router = useRouter()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  function updateParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString())
    if (value === null || value === '') next.delete(key)
    else next.set(key, value)
    startTransition(() => {
      router.replace(`/brands?${next.toString()}`)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <Input
        type="search"
        placeholder="search name, website, contact, notes…"
        defaultValue={q}
        onChange={(e) => updateParam('q', e.target.value)}
        className="w-64 h-9"
      />

      <Select
        value={category || 'all'}
        onValueChange={(v) => updateParam('category', v === 'all' ? null : v)}
      >
        <SelectTrigger className="w-40 h-9">
          <SelectValue placeholder="category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">all categories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={stage || 'all'}
        onValueChange={(v) => updateParam('stage', v === 'all' ? null : v)}
      >
        <SelectTrigger className="w-32 h-9">
          <SelectValue placeholder="stage" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">all stages</SelectItem>
          {BRAND_STAGES.map((s) => (
            <SelectItem key={s} value={s}>
              {STAGE_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={show}
        onValueChange={(v) => updateParam('show', v === 'active' ? null : v)}
      >
        <SelectTrigger className="w-32 h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">active</SelectItem>
          <SelectItem value="archived">archived</SelectItem>
          <SelectItem value="all">all</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={`${sort}:${dir}`}
        onValueChange={(v) => {
          const [nextSort, nextDir] = v.split(':')
          const sp = new URLSearchParams(params.toString())
          sp.set('sort', nextSort)
          sp.set('dir', nextDir)
          startTransition(() => router.replace(`/brands?${sp.toString()}`))
        }}
      >
        <SelectTrigger className="w-40 h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="created_at:desc">newest first</SelectItem>
          <SelectItem value="created_at:asc">oldest first</SelectItem>
          <SelectItem value="updated_at:desc">recently edited</SelectItem>
          <SelectItem value="brand_name:asc">name a–z</SelectItem>
          <SelectItem value="brand_name:desc">name z–a</SelectItem>
        </SelectContent>
      </Select>

      {pending ? (
        <span className="text-[0.75rem] text-muted-warm">updating…</span>
      ) : null}
    </div>
  )
}
