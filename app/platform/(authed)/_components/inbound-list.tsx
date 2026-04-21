'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import {
  archiveBrand,
  markBrandReviewed,
} from '../brands/_actions'
import {
  archiveCreator,
  markCreatorReviewed,
} from '../creators/_actions'

export type InboundItem = {
  kind: 'creator' | 'brand'
  id: string
  title: string
  subtitle: string
  summary: string
  createdAt: string
}

export function InboundList({ items }: { items: InboundItem[] }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  if (items.length === 0) {
    return (
      <p className="text-[0.9rem] text-muted-warm">
        nothing to triage. check back after more submissions come in.
      </p>
    )
  }

  const visible = items.filter((i) => !hidden.has(`${i.kind}:${i.id}`))

  if (visible.length === 0) {
    return (
      <p className="text-[0.9rem] text-muted-warm">
        all clear. everything in this batch has been triaged.
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {visible.map((item) => (
        <InboundRow
          key={`${item.kind}:${item.id}`}
          item={item}
          onHide={() =>
            setHidden((s) => {
              const next = new Set(s)
              next.add(`${item.kind}:${item.id}`)
              return next
            })
          }
        />
      ))}
    </ul>
  )
}

function InboundRow({
  item,
  onHide,
}: {
  item: InboundItem
  onHide: () => void
}) {
  const [pending, startTransition] = useTransition()
  const href =
    item.kind === 'creator' ? `/creators/${item.id}` : `/brands/${item.id}`

  function run(
    action: () => Promise<{ success: boolean; error?: string }>,
    successMessage: string
  ) {
    startTransition(async () => {
      const result = await action()
      if (!result.success) {
        toast.error(result.error ?? 'failed')
        return
      }
      toast.success(successMessage)
      onHide()
    })
  }

  function handleReview() {
    run(
      item.kind === 'creator'
        ? () => markCreatorReviewed(item.id, true)
        : () => markBrandReviewed(item.id, true),
      'marked reviewed'
    )
  }

  function handleArchive() {
    run(
      item.kind === 'creator'
        ? () => archiveCreator(item.id, true)
        : () => archiveBrand(item.id, true),
      'archived'
    )
  }

  return (
    <li className="bg-white border border-line/60 rounded-md p-4 flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge
            variant={item.kind === 'creator' ? 'default' : 'secondary'}
            className="text-[0.65rem] uppercase tracking-[0.1em]"
          >
            {item.kind}
          </Badge>
          <span className="text-[0.75rem] text-muted-warm">
            {relativeTime(item.createdAt)}
          </span>
        </div>
        <Link
          href={href}
          className="font-display text-[1.1rem] tracking-tight hover:text-coral transition-colors"
        >
          {item.title}
        </Link>
        <p className="text-[0.8rem] text-muted-warm truncate">
          {item.subtitle}
        </p>
        <p className="text-[0.85rem] text-ink-soft mt-1">{item.summary}</p>
      </div>

      <div className="flex flex-col gap-2 shrink-0">
        <Button
          size="sm"
          disabled={pending}
          onClick={handleReview}
        >
          mark reviewed
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={handleArchive}
        >
          archive
        </Button>
      </div>
    </li>
  )
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = 60 * 1000
  const hour = 60 * min
  const day = 24 * hour
  if (diff < min) return 'just now'
  if (diff < hour) return `${Math.floor(diff / min)}m ago`
  if (diff < day) return `${Math.floor(diff / hour)}h ago`
  if (diff < 30 * day) return `${Math.floor(diff / day)}d ago`
  return new Date(iso).toLocaleDateString()
}
