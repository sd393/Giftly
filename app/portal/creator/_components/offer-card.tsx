'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'

import { DeclineForm } from './decline-form'
import { NoObligationBanner } from './no-obligation-banner'
import type { PortalMatch } from './portal-tabs'

export function OfferCard({ match }: { match: PortalMatch }) {
  const [mode, setMode] = useState<'idle' | 'declining'>('idle')
  const [reasons, setReasons] = useState<string[]>([])
  const [note, setNote] = useState('')

  const product = match.product
  const brand = product?.brand ?? null

  return (
    <article className="bg-white border border-line/60 rounded-md overflow-hidden transition-all">
      <NoObligationBanner />

      <div className="p-5 md:p-6">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[0.7rem] uppercase tracking-[0.15em] text-muted-warm font-medium">
              from
            </p>
            <p className="font-display text-[1.05rem] tracking-tight">
              {brand?.brand_name ?? 'Brand'}
            </p>
          </div>

          {match.commission_pct !== null ? (
            <div className="shrink-0 text-right">
              <p className="text-[0.65rem] uppercase tracking-[0.1em] text-muted-warm">
                commission
              </p>
              <p className="font-display text-[1.1rem] text-coral">
                {match.commission_pct}%
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex items-start gap-4">
          {product?.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.name ?? ''}
              width={120}
              height={120}
              className="size-24 rounded-md object-cover bg-cream-warm shrink-0"
              loading="lazy"
            />
          ) : (
            <div className="size-24 rounded-md bg-cream-warm shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[0.95rem]">
              {product?.name ?? 'Product'}
            </p>
            {match.why_matched ? (
              <div className="mt-2">
                <p className="text-[0.65rem] uppercase tracking-[0.1em] text-muted-warm font-medium">
                  why we matched you
                </p>
                <p className="mt-1 text-[0.85rem] text-ink-soft leading-[1.55]">
                  {match.why_matched}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {mode === 'idle' ? (
          <div className="mt-6 flex items-center gap-2">
            <Button
              size="sm"
              variant="coral"
              onClick={() => {
                /* wired in Task 3.2 */
              }}
            >
              Accept the gift
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setMode('declining')}
            >
              Pass on this one
            </Button>
          </div>
        ) : (
          <>
            <DeclineForm
              reasons={reasons}
              note={note}
              onChangeReasons={setReasons}
              onChangeNote={setNote}
            />
            <div className="mt-4 flex items-center gap-2">
              <Button
                size="sm"
                variant="coral"
                onClick={() => {
                  /* wired in Task 3.2 */
                }}
              >
                Submit decline
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setMode('idle')
                  setReasons([])
                  setNote('')
                }}
              >
                Cancel
              </Button>
            </div>
          </>
        )}
      </div>
    </article>
  )
}
