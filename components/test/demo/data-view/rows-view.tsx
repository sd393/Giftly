import { ExternalLink } from 'lucide-react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { MATCH_ROWS } from '../lib/mock-data'

import { OutcomePill } from './outcome-pill'

export function RowsView() {
  return (
    <div className="border border-line/60 rounded-md bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Date</TableHead>
            <TableHead>Brand</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Creator</TableHead>
            <TableHead className="w-20">Audience</TableHead>
            <TableHead className="w-16 text-right">Fit</TableHead>
            <TableHead className="w-44">Outcome</TableHead>
            <TableHead>Detail</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {MATCH_ROWS.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="text-ink-soft text-[0.8rem]">
                {r.date}
              </TableCell>
              <TableCell className="text-[0.85rem]">{r.brand}</TableCell>
              <TableCell className="text-[0.85rem] text-ink-soft">
                {r.product}
              </TableCell>
              <TableCell className="text-[0.85rem] font-medium">
                {r.creatorHandle}
              </TableCell>
              <TableCell className="text-[0.8rem] text-ink-soft">
                {r.audienceLabel}
              </TableCell>
              <TableCell className="text-[0.85rem] text-right tabular-nums">
                {r.fitScore}%
              </TableCell>
              <TableCell>
                <OutcomePill outcome={r.outcome} />
              </TableCell>
              <TableCell className="text-[0.8rem] text-ink-soft max-w-[28rem]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="truncate">{r.detail}</span>
                  {r.postUrl ? (
                    <a
                      href={r.postUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.preventDefault()}
                      className="text-coral hover:text-coral-deep shrink-0"
                      aria-label="open post (decorative)"
                    >
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                    </a>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
