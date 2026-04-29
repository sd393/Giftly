'use client'

import { Badge } from '@/components/ui/badge'

import { ACTIVE_GIFT } from '../lib/mock-data'
import type { ActiveGiftFeedback } from '../lib/types'
import { usePersistedState } from '../lib/use-persisted-state'

import { FeedbackFlow } from './feedback-flow'

export function ActiveGiftsTab() {
  const [feedback, setFeedback] = usePersistedState<ActiveGiftFeedback>(
    'creator:active-gift-feedback',
    null
  )

  return (
    <div className="space-y-6">
      <article className="bg-white border border-line/60 rounded-md overflow-hidden">
        <div className="p-5 md:p-6 flex items-start gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ACTIVE_GIFT.productImageUrl}
            alt=""
            width={120}
            height={120}
            className="size-24 md:size-28 rounded-md object-cover bg-cream-warm shrink-0"
            loading="lazy"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge className="text-[0.65rem] uppercase tracking-[0.1em]">
                delivered
              </Badge>
              <span className="text-[0.75rem] text-muted-warm">
                {ACTIVE_GIFT.deliveredDaysAgo} days ago
              </span>
            </div>
            <p className="text-[0.78rem] text-muted-warm">
              from {ACTIVE_GIFT.brandName}
            </p>
            <h3 className="font-display text-[1.25rem] tracking-tight mt-0.5">
              {ACTIVE_GIFT.productName}
            </h3>
            <p className="mt-2 text-[0.85rem] text-ink-soft max-w-[52ch]">
              You can take your time with this. Use it for at least a few
              days before logging a reaction — and remember, &ldquo;I
              don&rsquo;t love it&rdquo; is a real, useful answer.
            </p>
          </div>
        </div>

        <div className="border-t border-line/60 px-5 md:px-6 py-5">
          <FeedbackFlow feedback={feedback} onChange={setFeedback} />
        </div>
      </article>

      <p className="text-[0.75rem] text-muted-warm max-w-[60ch]">
        We won&rsquo;t spam you. One nudge at the 14-day mark if you
        haven&rsquo;t logged a reaction, then we drop it.
      </p>
    </div>
  )
}
