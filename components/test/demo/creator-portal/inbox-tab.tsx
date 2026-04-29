'use client'

import { INBOX_OFFERS } from '../lib/mock-data'
import { usePersistedState } from '../lib/use-persisted-state'

import { OfferCard, type OfferStatus } from './offer-card'

type Responses = Record<string, 'accepted' | 'declined'>

export function InboxTab() {
  const [responses, setResponses] = usePersistedState<Responses>(
    'creator:offer-responses',
    {}
  )

  function respond(id: string, next: 'accepted' | 'declined') {
    setResponses((prev) => ({ ...prev, [id]: next }))
  }

  return (
    <div className="space-y-6">
      <p className="text-[0.85rem] text-ink-soft max-w-[60ch]">
        Three brands matched you this week. Accept what you&rsquo;d actually
        try; pass on the rest. Either response is useful — the goal is honest
        signal, not engagement quotas.
      </p>

      <ul className="space-y-4">
        {INBOX_OFFERS.map((offer) => {
          const status: OfferStatus = responses[offer.id] ?? null
          return (
            <li key={offer.id}>
              <OfferCard
                offer={offer}
                status={status}
                onRespond={respond}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
