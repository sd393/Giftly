import Link from 'next/link'

import { Badge } from '@/components/ui/badge'

type Row = {
  id: string
  name: string
  email: string
  platform: string | null
  followers: string | null
  niches: string[]
  owner_id: string | null
  reviewed_at: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

export function CreatorsTable({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <p className="mt-6 text-[0.9rem] text-muted-warm">
        no creators match the current filters.
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {rows.map((r) => {
        const niches = r.niches ?? []
        const summaryParts = [
          r.platform,
          niches.slice(0, 4).join(', ') +
            (niches.length > 4 ? ` +${niches.length - 4}` : ''),
        ].filter((p): p is string => Boolean(p && p.trim()))

        return (
          <li
            key={r.id}
            className="bg-white border border-line/60 rounded-md p-4 flex items-start gap-4"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="text-[0.65rem] uppercase tracking-[0.1em]">
                  creator
                </Badge>
                {!r.archived_at && !r.reviewed_at ? (
                  <Badge variant="secondary" className="text-[0.65rem]">
                    new
                  </Badge>
                ) : null}
                {r.archived_at ? (
                  <Badge variant="outline" className="text-[0.65rem]">
                    archived
                  </Badge>
                ) : null}
                <span className="text-[0.75rem] text-muted-warm">
                  added {relativeTime(r.created_at)}
                </span>
              </div>
              <Link
                href={`/creators/${r.id}`}
                className="font-display text-[1.1rem] tracking-tight hover:text-coral transition-colors"
              >
                {r.name}
              </Link>
              <p className="text-[0.8rem] text-muted-warm truncate">
                {r.email}
              </p>
              {summaryParts.length > 0 ? (
                <p className="text-[0.85rem] text-ink-soft mt-1 truncate">
                  {summaryParts.join(' · ')}
                </p>
              ) : null}
            </div>

            {r.followers ? (
              <div className="shrink-0 text-right">
                <div className="text-[0.65rem] uppercase tracking-[0.1em] text-muted-warm">
                  followers
                </div>
                <div className="text-[0.9rem] text-ink">{r.followers}</div>
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = 60 * 1000
  const hour = 60 * min
  const day = 24 * hour
  if (diff < min) return 'just now'
  if (diff < hour) return `${Math.floor(diff / min)}m ago`
  if (diff < day) return `${Math.floor(diff / hour)}h ago`
  if (diff < 30 * day) return `${Math.floor(diff / day)}d ago`
  return new Date(iso).toLocaleDateString()
}
