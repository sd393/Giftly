import { cn } from '@/lib/utils'

import {
  EYELASH_CURLER_SCHEMA,
  PRODUCT_SCORECARDS,
} from '../lib/mock-data'
import { ConfidenceDot } from '../lib/score-chip'
import type { ScorecardCell } from '../lib/types'

export function MatrixView() {
  const topAttrs = EYELASH_CURLER_SCHEMA.attributes.filter(
    (a) => a.in_top_schema
  )

  return (
    <div>
      <p className="mb-4 max-w-[64ch] text-[0.85rem] text-muted-warm">
        Every product re-scored against the standardized schema. Same eight
        attributes across every row, with sample size and confidence on every
        cell. <span className="italic">demonstrated</span> means a score was
        derived from explicit evidence;{' '}
        <span className="italic">inferred</span> means a score was derived
        from indirect signal at lower confidence; a dash means no record
        spoke to that attribute.
      </p>

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
                  className="text-left px-2 py-2 min-w-[110px]"
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
                <tr key={card.product_id} className="border-t border-line/40">
                  <th
                    scope="row"
                    className={cn(
                      'text-left px-3 py-3 sticky left-0 bg-white z-10 align-top',
                      isFeatured ? 'text-coral' : 'text-ink-soft'
                    )}
                  >
                    <p className="font-medium text-[0.82rem]">{card.brand}</p>
                    <p className="text-[0.7rem] text-muted-warm font-mono">
                      n = {card.total_records}
                    </p>
                  </th>
                  {topAttrs.map((attr) => (
                    <td
                      key={attr.canonical_name}
                      className="px-2 py-3 align-top"
                    >
                      <Cell cell={cellByAttr.get(attr.canonical_name)} />
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-6 max-w-[64ch] font-display italic font-light text-[1rem] md:text-[1.1rem] leading-[1.5] text-ink-soft border-l-2 border-coral pl-5">
        Same eight columns, every product. This is the matrix a shopping
        agent receives — comparable scores with confidence and sample size,
        not a wall of paid reviews.
      </p>
    </div>
  )
}

function Cell({ cell }: { cell: ScorecardCell | undefined }) {
  if (!cell || cell.status === 'not_demonstrated') {
    return (
      <span
        className="font-mono text-muted-warm/60 text-[1rem]"
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
            'font-mono tabular-nums text-[1rem]',
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
