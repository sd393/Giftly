'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type MessagesQuery = {
  channel: string
  status: string
  direction: string
  by: '' | 'user' | 'agent'
  since: '7d' | '30d' | '90d' | 'all'
}

const STATUS_OPTS = ['sent', 'delivered', 'replied', 'bounced', 'failed']

export function MessagesFilters({
  query,
  availableChannels,
}: {
  query: MessagesQuery
  availableChannels: string[]
}) {
  const router = useRouter()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString())
    if (value === '' || value === 'all') next.delete(key)
    else next.set(key, value)
    next.set('tab', 'messages')
    startTransition(() => router.replace(`/outbound?${next.toString()}`))
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={query.since}
        onValueChange={(v) => update('since', v === '30d' ? '' : v)}
      >
        <SelectTrigger className="w-28 h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7d">last 7 days</SelectItem>
          <SelectItem value="30d">last 30 days</SelectItem>
          <SelectItem value="90d">last 90 days</SelectItem>
          <SelectItem value="all">all time</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={query.channel || 'all'}
        onValueChange={(v) => update('channel', v)}
      >
        <SelectTrigger className="w-40 h-9">
          <SelectValue placeholder="channel" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">all channels</SelectItem>
          {availableChannels.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={query.status || 'all'}
        onValueChange={(v) => update('status', v)}
      >
        <SelectTrigger className="w-32 h-9">
          <SelectValue placeholder="status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">any status</SelectItem>
          {STATUS_OPTS.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={query.direction || 'all'}
        onValueChange={(v) => update('direction', v)}
      >
        <SelectTrigger className="w-32 h-9">
          <SelectValue placeholder="direction" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">both ways</SelectItem>
          <SelectItem value="outbound">outbound</SelectItem>
          <SelectItem value="inbound">inbound</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={query.by || 'all'}
        onValueChange={(v) => update('by', v)}
      >
        <SelectTrigger className="w-32 h-9">
          <SelectValue placeholder="source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">user + agent</SelectItem>
          <SelectItem value="user">user only</SelectItem>
          <SelectItem value="agent">agent only</SelectItem>
        </SelectContent>
      </Select>

      {pending ? (
        <span className="text-[0.75rem] text-muted-warm">updating…</span>
      ) : null}
    </div>
  )
}
