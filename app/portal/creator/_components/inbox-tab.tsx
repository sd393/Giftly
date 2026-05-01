import type { PortalMatch } from './portal-tabs'

export function InboxTab({ matches }: { matches: PortalMatch[] }) {
  if (!matches.length) {
    return (
      <p className="text-[0.9rem] text-muted-warm">
        No new offers — we&rsquo;ll let you know when one comes in.
      </p>
    )
  }
  return <pre>{JSON.stringify(matches, null, 2)}</pre>
}
