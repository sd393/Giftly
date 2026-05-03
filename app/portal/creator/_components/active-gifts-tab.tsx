import { ActiveGiftCard } from './active-gift-card'
import type { PortalMatch } from './portal-tabs'

export function ActiveGiftsTab({ matches }: { matches: PortalMatch[] }) {
  if (!matches.length) {
    return (
      <p className="text-[0.9rem] text-muted-warm">
        Once you accept an offer it&rsquo;ll show up here.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <ul className="space-y-4">
        {matches.map((match) => (
          <li key={match.id}>
            <ActiveGiftCard match={match} />
          </li>
        ))}
      </ul>

      <p className="text-[0.75rem] text-muted-warm max-w-[60ch]">
        We won&rsquo;t spam you. One nudge at the 14-day mark if you
        haven&rsquo;t logged a reaction, then we drop it.
      </p>
    </div>
  )
}
