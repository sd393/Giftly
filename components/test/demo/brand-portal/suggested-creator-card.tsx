'use client'

import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import type { Creator } from '../lib/types'

export function SuggestedCreatorCard({
  creator,
  onApprove,
  pending,
}: {
  creator: Creator
  onApprove: (id: string) => void
  pending: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <article
      className={cn(
        'bg-white border border-line/60 rounded-md transition-shadow',
        expanded && 'shadow-[0_8px_24px_-16px_rgba(42,26,18,0.18)]'
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full text-left p-4 flex items-start gap-4 hover:bg-cream-warm/40 transition-colors rounded-md"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={creator.avatarUrl}
          alt=""
          width={56}
          height={56}
          className="size-14 rounded-full object-cover shrink-0"
          loading="lazy"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display text-[1.05rem] tracking-tight">
              {creator.handle}
            </span>
            <span className="text-[0.8rem] text-muted-warm">
              · {creator.displayName}
            </span>
          </div>
          <p className="mt-0.5 text-[0.8rem] text-ink-soft">
            {creator.followersLabel} followers · {creator.niche} ·{' '}
            {creator.city}
          </p>

          {!expanded ? (
            <ul className="mt-3 space-y-1 text-[0.85rem] text-ink-soft">
              {creator.reasons.map((r) => (
                <li key={r.short} className="flex items-start gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 size-1 rounded-full bg-coral shrink-0"
                  />
                  <span>{r.short}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="shrink-0 flex flex-col items-center gap-2">
          <FitBadge fit={creator.fitScore} />
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'size-4 text-muted-warm transition-transform',
              expanded && 'rotate-180'
            )}
          />
        </div>
      </button>

      {expanded ? (
        <div className="px-4 pb-5 pt-0 -mt-2">
          <div className="border-t border-line/60 pt-4 space-y-4">
            {creator.reasons.map((r, i) => (
              <div key={r.short}>
                <p className="text-[0.65rem] uppercase tracking-[0.15em] text-muted-warm font-medium">
                  reason {i + 1}
                </p>
                <p className="mt-1 text-[0.9rem] text-ink leading-[1.55]">
                  {r.long}
                </p>
              </div>
            ))}

            <div className="pt-2 flex items-center gap-2">
              <Button
                size="sm"
                disabled={pending}
                onClick={() => onApprove(creator.id)}
              >
                Approve match
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setExpanded(false)}
              >
                Pass for now
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  )
}

function FitBadge({ fit }: { fit: number }) {
  const tone =
    fit >= 90
      ? 'bg-coral text-cream'
      : fit >= 80
        ? 'bg-coral/85 text-cream'
        : 'bg-cream-deep text-ink'

  return (
    <span
      className={cn(
        'inline-flex flex-col items-center justify-center size-12 rounded-full text-[0.75rem] font-medium leading-none',
        tone
      )}
      aria-label={`fit score ${fit} percent`}
    >
      <span className="font-display text-[0.95rem]">{fit}%</span>
      <span className="text-[0.55rem] uppercase tracking-[0.12em] mt-0.5 opacity-80">
        fit
      </span>
    </span>
  )
}
