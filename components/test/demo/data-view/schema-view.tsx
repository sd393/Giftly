import { cn } from '@/lib/utils'

import { EYELASH_CURLER_SCHEMA } from '../lib/mock-data'
import type { SchemaAttribute } from '../lib/types'

export function SchemaView() {
  const schema = EYELASH_CURLER_SCHEMA
  const topAttrs = schema.attributes.filter((a) => a.in_top_schema)
  const tailAttrs = schema.attributes.filter((a) => !a.in_top_schema)

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-[0.8rem]">
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded font-mono text-[0.7rem] border uppercase tracking-[0.08em]',
            schema.maturity === 'mature'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
              : schema.maturity === 'developing'
                ? 'border-amber-300 bg-amber-100 text-amber-800'
                : 'border-rose-300 bg-rose-50 text-rose-700'
          )}
        >
          {schema.maturity}
        </span>
        <span className="font-mono text-muted-warm">
          schema {schema.schema_version}
        </span>
        <span className="text-muted-warm">·</span>
        <span className="text-muted-warm">
          generated {schema.generated_at} from {schema.total_records} records
        </span>
      </div>

      <p className="mb-4 max-w-[64ch] text-[0.85rem] text-muted-warm">
        The category schema is induced from the corpus, not chosen by hand.
        Each attribute is scored on three signals — how often it shows up
        across videos, how much it varies between products, and how strongly
        it tracks the evaluator&rsquo;s overall reaction — then blended into
        a single importance score. Top {topAttrs.length} survive the cutoff.
      </p>

      <div className="rounded-md border border-line/60 bg-white overflow-hidden">
        <div className="grid grid-cols-[28px_1fr_72px_72px_84px_92px_72px] gap-3 px-4 py-2.5 border-b border-line/60 bg-cream-warm/30 text-[0.68rem] uppercase tracking-[0.1em] text-muted-warm font-medium">
          <span>#</span>
          <span>attribute</span>
          <span className="text-right">recur</span>
          <span className="text-right">discrim</span>
          <span className="text-right">sent corr</span>
          <span className="text-right">importance</span>
          <span className="text-right">in schema</span>
        </div>
        {topAttrs.map((a) => (
          <SchemaRow key={a.canonical_name} attr={a} inTop />
        ))}

        <div className="px-4 py-2 border-y border-dashed border-coral/40 bg-coral/5 text-[0.72rem] uppercase tracking-[0.12em] text-coral font-mono">
          ↓ top-{topAttrs.length} cutoff
        </div>

        {tailAttrs.map((a) => (
          <SchemaRow key={a.canonical_name} attr={a} inTop={false} />
        ))}
      </div>
    </div>
  )
}

function SchemaRow({
  attr,
  inTop,
}: {
  attr: SchemaAttribute
  inTop: boolean
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-[28px_1fr_72px_72px_84px_92px_72px] gap-3 items-center px-4 py-2.5 border-b border-line/40 last:border-b-0 text-[0.82rem]',
        inTop ? 'text-ink' : 'text-muted-warm/70 italic'
      )}
    >
      <span className="font-mono text-[0.78rem] text-muted-warm">{attr.rank}</span>
      <div className="min-w-0">
        <p className="truncate font-medium">{attr.display_label}</p>
        <p className="truncate font-mono text-[0.7rem] text-muted-warm">
          {attr.canonical_name}
        </p>
      </div>
      <span className="text-right font-mono text-[0.78rem] tabular-nums">
        {attr.recurrence_pct}%
      </span>
      <span className="text-right font-mono text-[0.78rem] tabular-nums">
        {attr.discrimination.toFixed(2)}
      </span>
      <span className="text-right font-mono text-[0.78rem] tabular-nums">
        {attr.sentiment_correlation >= 0 ? '+' : ''}
        {attr.sentiment_correlation.toFixed(2)}
      </span>
      <div className="flex items-center gap-2 justify-end">
        <span className="font-mono text-[0.78rem] tabular-nums w-9 text-right">
          {attr.importance_score.toFixed(2)}
        </span>
        <div className="relative h-1.5 w-12 rounded-full bg-line/60 overflow-hidden">
          <span
            className={cn(
              'absolute inset-y-0 left-0 rounded-full',
              inTop ? 'bg-coral' : 'bg-muted-warm/60'
            )}
            style={{ width: `${Math.max(attr.importance_score * 100, 4)}%` }}
          />
        </div>
      </div>
      <span className="text-right font-mono text-[0.72rem]">
        {inTop ? (
          <span className="text-emerald-700">yes</span>
        ) : (
          <span className="text-muted-warm">no</span>
        )}
      </span>
    </div>
  )
}
