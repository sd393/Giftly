'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

import { setBrandStage } from '../../brands/_actions'

export type InTalksBrand = {
  id: string
  brand_name: string
  website: string
  last_reply_at: string | null
}

export function InTalksList({ brands }: { brands: InTalksBrand[] }) {
  if (brands.length === 0) return null

  return (
    <section className="mb-6">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-[0.75rem] uppercase tracking-[0.15em] text-muted-warm font-medium">
          in talks ({brands.length})
        </h2>
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {brands.map((b) => (
          <InTalksRow key={b.id} brand={b} />
        ))}
      </ul>
    </section>
  )
}

function InTalksRow({ brand }: { brand: InTalksBrand }) {
  const [pending, startTransition] = useTransition()

  function handleDone() {
    startTransition(async () => {
      const result = await setBrandStage(brand.id, 'done')
      if (!result.success) toast.error(result.error ?? 'failed')
      else toast.success('marked done')
    })
  }

  return (
    <li className="bg-white border border-line/60 rounded-md p-4 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <Link
          href={`/brands/${brand.id}`}
          className="font-display text-[1.05rem] tracking-tight hover:text-coral transition-colors"
        >
          {brand.brand_name}
        </Link>
        <p className="text-[0.75rem] text-muted-warm truncate">
          {brand.website}
          {brand.last_reply_at ? (
            <>
              {' · last reply '}
              {relativeTime(brand.last_reply_at)}
            </>
          ) : null}
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={handleDone}
      >
        mark done
      </Button>
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
