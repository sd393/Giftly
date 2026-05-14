import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import {
  EYELASH_CURLER_SCHEMA,
  PRODUCT_SCORECARDS,
} from '../lib/mock-data'
import { ConfidenceDot } from '../lib/score-chip'
import type { ScorecardCell } from '../lib/types'

export function Stage7Matrix() {
  const topAttrs = EYELASH_CURLER_SCHEMA.attributes.filter(
    (a) => a.in_top_schema
  )

  return (
    <div className="space-y-5">
      <div className="overflow-x-auto rounded-md border border-line/60 bg-white">
        <table className="min-w-full text-[0.8rem]">
          <thead>
            <tr className="bg-cream-warm/30 text-[0.68rem] uppercase tracking-[0.1em] text-muted-warm font-medium">
              <th className="text-left px-3 py-2 sticky left-0 bg-cream-warm/30 z-10">
                product
              </th>
              {topAttrs.map((a) => (
                <th
                  key={a.canonical_name}
                  className="text-left px-2 py-2 min-w-[100px]"
                >
                  {a.display_label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PRODUCT_SCORECARDS.map((card) => {
              const cellByAttr = new Map(
                card.cells.map((c) => [c.attribute_canonical, c])
              )
              const isFeatured = card.brand === 'Bime Beauty'
              return (
                <tr
                  key={card.product_id}
                  className="border-t border-line/40"
                >
                  <th
                    scope="row"
                    className={cn(
                      'text-left px-3 py-3 sticky left-0 bg-white z-10 align-top',
                      isFeatured ? 'text-coral' : 'text-ink-soft'
                    )}
                  >
                    <p className="font-medium text-[0.82rem]">{card.brand}</p>
                    <p className="text-[0.72rem] text-muted-warm">
                      n = {card.total_records}
                    </p>
                  </th>
                  {topAttrs.map((attr) => {
                    const cell = cellByAttr.get(attr.canonical_name)
                    return (
                      <td key={attr.canonical_name} className="px-2 py-3 align-top">
                        <Cell cell={cell} />
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[0.78rem] text-muted-warm max-w-[60ch]">
          The same eight attributes scored across every product. Confidence
          and sample size travel with every cell so an agent can filter at
          the threshold it cares about.
        </p>
        <Link href="/demo/data">
          <Button variant="outline" className="text-[0.8rem]">
            → see this in the data tab
          </Button>
        </Link>
      </div>
    </div>
  )
}

function Cell({ cell }: { cell: ScorecardCell | undefined }) {
  if (!cell || cell.status === 'not_demonstrated') {
    return (
      <span
        className="font-mono text-muted-warm/60 text-[0.9rem]"
        title="not demonstrated in any video"
      >
        —
      </span>
    )
  }
  const isInferred = cell.status === 'inferred'
  return (
    <div className="space-y-1">
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            'font-mono tabular-nums text-[0.95rem]',
            isInferred ? 'italic text-ink-soft' : 'text-ink'
          )}
        >
          {isInferred ? '~' : ''}
          {cell.score_1_to_5!.toFixed(1)}
        </span>
        <ConfidenceDot confidence={cell.confidence} />
      </div>
      <p className="font-mono text-[0.65rem] text-muted-warm">
        n={cell.sample_size}
      </p>
    </div>
  )
}
