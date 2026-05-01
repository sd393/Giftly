import type { PortalMatch } from './portal-tabs'

export function ActiveGiftsTab({ matches }: { matches: PortalMatch[] }) {
  if (!matches.length) {
    return (
      <p className="text-[0.9rem] text-muted-warm">
        Once you accept an offer it&rsquo;ll show up here.
      </p>
    )
  }
  return <pre>{JSON.stringify(matches, null, 2)}</pre>
}
