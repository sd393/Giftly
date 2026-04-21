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

type Props = {
  q: string
  platform: string
  niche: string
  sort: string
  dir: 'asc' | 'desc'
  show: 'active' | 'archived' | 'all'
  platforms: string[]
  niches: string[]
}

export function CreatorsFilters({
  q,
  platform,
  niche,
  sort,
  dir,
  show,
  platforms,
  niches,
}: Props) {
  const router = useRouter()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  function updateParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString())
    if (value === null || value === '') next.delete(key)
    else next.set(key, value)
    startTransition(() => {
      router.replace(`/creators?${next.toString()}`)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <Input
        type="search"
        placeholder="search name, email, handles, notes…"
        defaultValue={q}
        onChange={(e) => updateParam('q', e.target.value)}
        className="w-64 h-9"
      />

      <Select
        value={platform || 'all'}
        onValueChange={(v) => updateParam('platform', v === 'all' ? null : v)}
      >
        <SelectTrigger className="w-36 h-9">
          <SelectValue placeholder="platform" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">all platforms</SelectItem>
          {platforms.map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={niche || 'all'}
        onValueChange={(v) => updateParam('niche', v === 'all' ? null : v)}
      >
        <SelectTrigger className="w-36 h-9">
          <SelectValue placeholder="niche" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">all niches</SelectItem>
          {niches.map((n) => (
            <SelectItem key={n} value={n}>
              {n}
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
          startTransition(() => router.replace(`/creators?${sp.toString()}`))
        }}
      >
        <SelectTrigger className="w-40 h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="created_at:desc">newest first</SelectItem>
          <SelectItem value="created_at:asc">oldest first</SelectItem>
          <SelectItem value="updated_at:desc">recently edited</SelectItem>
          <SelectItem value="name:asc">name a–z</SelectItem>
          <SelectItem value="name:desc">name z–a</SelectItem>
        </SelectContent>
      </Select>

      {pending ? (
        <span className="text-[0.75rem] text-muted-warm">updating…</span>
      ) : null}
    </div>
  )
}
