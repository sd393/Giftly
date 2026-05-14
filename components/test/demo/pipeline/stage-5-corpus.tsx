import { cn } from '@/lib/utils'

import { HERO_VIDEO_ID, PER_VIDEO_EXTRACTIONS } from '../lib/mock-data'

export function Stage5Corpus() {
  const total = PER_VIDEO_EXTRACTIONS.length
  const threshold = 10
  const thresholdMet = total >= threshold

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 md:gap-2.5">
        {PER_VIDEO_EXTRACTIONS.map((extraction) => {
          const isHero = extraction.record_id === HERO_VIDEO_ID
          return (
            <div
              key={extraction.record_id}
              className={cn(
                'aspect-video rounded-sm border flex flex-col justify-between p-1.5',
                isHero
                  ? 'border-coral bg-coral/10 shadow-[0_4px_12px_-8px_rgba(229,90,78,0.4)]'
                  : 'border-line/60 bg-cream-warm/40 opacity-60'
              )}
            >
              <span
                className={cn(
                  'font-mono text-[0.6rem]',
                  isHero ? 'text-coral' : 'text-muted-warm'
                )}
              >
                {extraction.record_id}
              </span>
              <span
                className={cn(
                  'font-mono text-[0.55rem] uppercase tracking-[0.08em] text-right',
                  extraction.verdict === 'positive'
                    ? 'text-emerald-700'
                    : 'text-rose-700'
                )}
              >
                {extraction.verdict[0]}
              </span>
            </div>
          )
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-md border border-line/60 bg-white p-4">
          <p className="text-[0.7rem] uppercase tracking-[0.15em] text-muted-warm font-medium">
            corpus
          </p>
          <p className="mt-1 font-display text-[1.6rem] tracking-tight tabular-nums">
            {total}
            <span className="ml-2 text-[0.85rem] text-muted-warm font-sans not-italic">
              evaluations · eyelash curlers
            </span>
          </p>
        </div>
        <div className="rounded-md border border-line/60 bg-white p-4">
          <p className="text-[0.7rem] uppercase tracking-[0.15em] text-muted-warm font-medium">
            schema-discovery threshold
          </p>
          <p
            className={cn(
              'mt-1 font-display text-[1.6rem] tracking-tight tabular-nums',
              thresholdMet ? 'text-emerald-700' : 'text-rose-700'
            )}
          >
            {threshold} <span className="text-muted-warm">/ records</span>
          </p>
          <p className="mt-1 text-[0.78rem] text-muted-warm">
            {thresholdMet
              ? 'threshold met — ready to induce a category schema'
              : 'still accumulating evaluations'}
          </p>
        </div>
      </div>
    </div>
  )
}
