import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

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

export function CreatorsTable({
  rows,
  sort,
  dir,
  currentParams,
}: {
  rows: Row[]
  sort: string
  dir: 'asc' | 'desc'
  currentParams: Record<string, string | undefined>
}) {
  if (rows.length === 0) {
    return (
      <p className="mt-6 text-[0.9rem] text-muted-warm">
        no creators match the current filters.
      </p>
    )
  }

  function sortHref(field: string) {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(currentParams)) {
      if (v != null && v !== '') sp.set(k, v)
    }
    sp.set('sort', field)
    sp.set('dir', sort === field && dir === 'asc' ? 'desc' : 'asc')
    return `/creators?${sp.toString()}`
  }

  function SortHeader({
    field,
    label,
    className,
  }: {
    field: string
    label: string
    className?: string
  }) {
    const active = sort === field
    return (
      <TableHead className={className}>
        <Link
          href={sortHref(field)}
          className={`inline-flex items-center gap-1 ${active ? 'text-ink' : 'text-muted-warm hover:text-ink'}`}
        >
          {label}
          {active ? <span aria-hidden>{dir === 'asc' ? '↑' : '↓'}</span> : null}
        </Link>
      </TableHead>
    )
  }

  return (
    <div className="border border-line/60 rounded-md bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <SortHeader field="name" label="name" />
            <TableHead>email</TableHead>
            <TableHead>platform</TableHead>
            <TableHead>followers</TableHead>
            <TableHead>niches</TableHead>
            <SortHeader field="created_at" label="added" className="w-28" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id} className="cursor-pointer">
              <TableCell className="font-medium">
                <Link
                  href={`/creators/${r.id}`}
                  className="hover:text-coral transition-colors"
                >
                  {r.name}
                </Link>
                {r.archived_at ? (
                  <Badge variant="outline" className="ml-2 text-[0.65rem]">
                    archived
                  </Badge>
                ) : null}
                {!r.archived_at && !r.reviewed_at ? (
                  <Badge className="ml-2 text-[0.65rem]">new</Badge>
                ) : null}
              </TableCell>
              <TableCell className="text-ink-soft">{r.email}</TableCell>
              <TableCell className="text-ink-soft">
                {r.platform || '—'}
              </TableCell>
              <TableCell className="text-ink-soft">
                {r.followers || '—'}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {(r.niches ?? []).slice(0, 4).map((n) => (
                    <Badge
                      key={n}
                      variant="secondary"
                      className="text-[0.65rem]"
                    >
                      {n}
                    </Badge>
                  ))}
                  {(r.niches?.length ?? 0) > 4 ? (
                    <Badge variant="outline" className="text-[0.65rem]">
                      +{(r.niches?.length ?? 0) - 4}
                    </Badge>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="text-ink-soft text-[0.8rem]">
                {new Date(r.created_at).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
