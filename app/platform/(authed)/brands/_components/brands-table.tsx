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
  brand_name: string
  website: string
  category: string | null
  contact_name: string
  contact_email: string
  owner_id: string | null
  reviewed_at: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

export function BrandsTable({
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
        no brands match the current filters.
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
    return `/brands?${sp.toString()}`
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
            <SortHeader field="brand_name" label="brand" />
            <TableHead>website</TableHead>
            <TableHead>category</TableHead>
            <TableHead>contact</TableHead>
            <SortHeader field="created_at" label="added" className="w-28" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">
                <Link
                  href={`/brands/${r.id}`}
                  className="hover:text-coral transition-colors"
                >
                  {r.brand_name}
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
              <TableCell className="text-ink-soft">
                <a
                  href={`https://${r.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-coral"
                >
                  {r.website}
                </a>
              </TableCell>
              <TableCell className="text-ink-soft">
                {r.category || '—'}
              </TableCell>
              <TableCell className="text-ink-soft">
                <div>{r.contact_name}</div>
                <div className="text-[0.75rem]">{r.contact_email}</div>
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
