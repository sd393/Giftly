import { Check, Package, Truck } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import type { Creator, InProgressStage, Match } from '../lib/types'

const STAGES: { id: InProgressStage; label: string }[] = [
  { id: 'approved', label: 'Approved' },
  { id: 'shipped', label: 'Shipped' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'awaiting-reaction', label: 'Awaiting reaction' },
  { id: 'posted', label: 'Posted' },
]

export function InProgressCard({
  match,
  creator,
}: {
  match: Match
  creator?: Creator
}) {
  const reachedIndex = STAGES.findIndex((s) => s.id === match.stage)

  return (
    <article className="bg-white border border-line/60 rounded-md p-4">
      <div className="flex items-start gap-4">
        {creator ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={creator.avatarUrl}
              alt=""
              width={48}
              height={48}
              className="size-12 rounded-full object-cover shrink-0"
              loading="lazy"
            />
          </>
        ) : (
          <div className="size-12 rounded-full bg-cream-deep shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display text-[1rem] tracking-tight">
              {creator?.handle ?? 'creator'}
            </span>
            {creator ? (
              <span className="text-[0.78rem] text-muted-warm">
                · {creator.displayName}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[0.8rem] text-ink-soft">
            {match.stageLabel}
          </p>
          {match.detail ? (
            <p className="mt-1 text-[0.75rem] text-muted-warm">
              {match.detail}
            </p>
          ) : null}
        </div>

        <Badge variant="outline" className="text-[0.65rem] uppercase shrink-0">
          {STAGES[reachedIndex]?.label ?? match.stage}
        </Badge>
      </div>

      <ol className="mt-4 flex items-center gap-1 text-[0.65rem] text-muted-warm">
        {STAGES.map((s, i) => {
          const reached = i <= reachedIndex
          return (
            <li
              key={s.id}
              className="flex-1 flex items-center gap-1 min-w-0"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'size-2 rounded-full shrink-0',
                  reached ? 'bg-coral' : 'bg-line'
                )}
              />
              <span
                className={cn(
                  'truncate',
                  reached ? 'text-ink' : 'text-muted-warm'
                )}
              >
                {s.label}
              </span>
              {i < STAGES.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex-1 h-px',
                    i < reachedIndex ? 'bg-coral/60' : 'bg-line'
                  )}
                />
              ) : null}
            </li>
          )
        })}
      </ol>

      <div className="mt-3 flex items-center gap-3 text-[0.7rem] text-muted-warm">
        <span className="inline-flex items-center gap-1">
          <Package className="size-3" aria-hidden="true" />
          tracked
        </span>
        <span className="inline-flex items-center gap-1">
          <Truck className="size-3" aria-hidden="true" />
          carrier UPS
        </span>
        <span className="inline-flex items-center gap-1">
          <Check className="size-3" aria-hidden="true" />
          insured
        </span>
      </div>
    </article>
  )
}
