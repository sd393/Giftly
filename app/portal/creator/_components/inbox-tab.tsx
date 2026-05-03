import { OfferCard } from './offer-card'
import type { PortalMatch } from './portal-tabs'

export function InboxTab({ matches }: { matches: PortalMatch[] }) {
  if (!matches.length) {
    return (
      <p className="text-[0.9rem] text-muted-warm">
        No new offers — we&rsquo;ll let you know when one comes in.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <p className="text-[0.85rem] text-ink-soft max-w-[60ch]">
        {matches.length === 1
          ? 'One brand matched you.'
          : `${matches.length} brands matched you.`}{' '}
        Accept what you&rsquo;d actually try; pass on the rest. Either response
        is useful — the goal is honest signal, not engagement quotas.
      </p>

      <ul className="space-y-4">
        {matches.map((match) => (
          <li key={match.id}>
            <OfferCard match={match} />
          </li>
        ))}
      </ul>
    </div>
  )
}
