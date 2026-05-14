import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function StageFrame({
  stageIdx,
  totalStages,
  title,
  subtitle,
  children,
}: {
  stageIdx: number
  totalStages: number
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <section className="rounded-lg border border-line/60 bg-white p-6 md:p-8 shadow-[0_8px_24px_-20px_rgba(40,30,20,0.18)]">
      <header className="mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-warm font-medium">
            Stage {stageIdx + 1} of {totalStages} · {title}
          </p>
          <ProgressDots current={stageIdx} total={totalStages} />
        </div>
        <p className="mt-2 font-display text-[1.4rem] md:text-[1.65rem] tracking-tight leading-[1.15]">
          {subtitle}
        </p>
      </header>
      <div>{children}</div>
    </section>
  )
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div
      className="flex items-center gap-1.5"
      aria-label={`stage ${current + 1} of ${total}`}
    >
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            'block size-2 rounded-full transition-colors',
            i <= current ? 'bg-coral' : 'bg-line/70'
          )}
        />
      ))}
    </div>
  )
}
