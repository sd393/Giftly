import { cn } from '@/lib/utils'

import { EYELASH_CURLER_SCHEMA } from '../lib/mock-data'
import type { SchemaAttribute } from '../lib/types'

export function Stage6Schema() {
  const schema = EYELASH_CURLER_SCHEMA
  const topAttrs = schema.attributes.filter((a) => a.in_top_schema)
  const tailAttrs = schema.attributes.filter((a) => !a.in_top_schema)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 text-[0.78rem]">
        <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-[0.7rem] border border-amber-300 bg-amber-100 text-amber-800 uppercase tracking-[0.08em]">
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

      <div className="rounded-md border border-line/60 bg-white overflow-hidden">
        <div className="grid grid-cols-[28px_1fr_72px_72px_72px_88px] gap-3 px-4 py-2.5 border-b border-line/60 bg-cream-warm/30 text-[0.68rem] uppercase tracking-[0.1em] text-muted-warm font-medium">
          <span>#</span>
          <span>attribute</span>
          <span className="text-right">recur</span>
          <span className="text-right">discrim</span>
          <span className="text-right">sent corr</span>
          <span className="text-right">importance</span>
        </div>
        {topAttrs.map((attr) => (
          <SchemaRow key={attr.canonical_name} attr={attr} inTop />
        ))}

        <div className="px-4 py-2 border-y border-dashed border-coral/40 bg-coral/5 text-[0.72rem] uppercase tracking-[0.12em] text-coral font-mono">
          ↓ top-{topAttrs.length} cutoff · candidates below are filtered out
        </div>

        {tailAttrs.map((attr) => (
          <SchemaRow key={attr.canonical_name} attr={attr} inTop={false} />
        ))}
      </div>

      <p className="text-[0.78rem] text-muted-warm max-w-[64ch]">
        Importance blends three signals: how often the attribute shows up
        across videos (<strong>recurrence</strong>), how much it varies
        between products (<strong>discrimination</strong>), and how strongly
        it tracks the evaluator&rsquo;s overall reaction (
        <strong>sentiment correlation</strong>).
      </p>
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
        'grid grid-cols-[28px_1fr_72px_72px_72px_88px] gap-3 items-center px-4 py-2.5 border-b border-line/40 last:border-b-0 text-[0.82rem]',
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
      <ImportanceBar value={attr.importance_score} inTop={inTop} />
    </div>
  )
}

function ImportanceBar({ value, inTop }: { value: number; inTop: boolean }) {
  return (
    <div className="flex items-center gap-2 justify-end">
      <span className="font-mono text-[0.78rem] tabular-nums w-8 text-right">
        {value.toFixed(2)}
      </span>
      <div className="relative h-1.5 w-12 rounded-full bg-line/60 overflow-hidden">
        <span
          className={cn(
            'absolute inset-y-0 left-0 rounded-full',
            inTop ? 'bg-coral' : 'bg-muted-warm/60'
          )}
          style={{ width: `${Math.max(value * 100, 4)}%` }}
        />
      </div>
    </div>
  )
}
