'use client'

import { Check, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import type { Offer } from '../lib/types'

import { NoObligationBanner } from './no-obligation-banner'

export type OfferStatus = 'accepted' | 'declined' | null

export function OfferCard({
  offer,
  status,
  onRespond,
}: {
  offer: Offer
  status: OfferStatus
  onRespond: (id: string, next: 'accepted' | 'declined') => void
}) {
  const respondedClass =
    status === 'accepted'
      ? 'border-coral/40'
      : status === 'declined'
        ? 'opacity-70'
        : ''

  return (
    <article
      className={cn(
        'bg-white border border-line/60 rounded-md overflow-hidden transition-all',
        respondedClass
      )}
    >
      <NoObligationBanner />

      <div className="p-5 md:p-6">
        <div className="flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={offer.brandLogoUrl}
            alt=""
            width={48}
            height={48}
            className="size-12 rounded-md object-cover bg-cream-warm shrink-0"
            loading="lazy"
          />

          <div className="flex-1 min-w-0">
            <p className="text-[0.7rem] uppercase tracking-[0.15em] text-muted-warm font-medium">
              from
            </p>
            <p className="font-display text-[1.05rem] tracking-tight">
              {offer.brandName}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[0.65rem] uppercase tracking-[0.1em] text-muted-warm">
              commission
            </p>
            <p className="font-display text-[1.1rem] text-coral">
              {offer.commissionPct}%
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={offer.productImageUrl}
            alt={offer.productName}
            width={120}
            height={120}
            className="size-24 rounded-md object-cover bg-cream-warm shrink-0"
            loading="lazy"
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[0.95rem]">{offer.productName}</p>
            <div className="mt-2">
              <p className="text-[0.65rem] uppercase tracking-[0.1em] text-muted-warm font-medium">
                why we matched you
              </p>
              <p className="mt-1 text-[0.85rem] text-ink-soft leading-[1.55]">
                {offer.whyMatched}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2">
          {status === null ? (
            <>
              <Button
                size="sm"
                variant="coral"
                onClick={() => onRespond(offer.id, 'accepted')}
              >
                Accept the gift
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRespond(offer.id, 'declined')}
              >
                Pass on this one
              </Button>
            </>
          ) : (
            <>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 text-[0.8rem] font-medium',
                  status === 'accepted' ? 'text-coral' : 'text-muted-warm'
                )}
              >
                {status === 'accepted' ? (
                  <Check className="size-4" aria-hidden="true" />
                ) : (
                  <X className="size-4" aria-hidden="true" />
                )}
                {status === 'accepted'
                  ? 'Accepted — we’ll ship next'
                  : 'Passed — we won’t pitch this one again'}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  onRespond(
                    offer.id,
                    status === 'accepted' ? 'declined' : 'accepted'
                  )
                }
              >
                undo
              </Button>
            </>
          )}
        </div>
      </div>
    </article>
  )
}
