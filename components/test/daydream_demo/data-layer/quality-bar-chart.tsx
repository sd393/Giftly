'use client'

import type { QualityDimensions } from '../lib/types'

const LABELS: { key: keyof QualityDimensions; label: string }[] = [
  { key: 'durability', label: 'durability' },
  { key: 'fit', label: 'fit' },
  { key: 'aesthetics', label: 'aesthetics' },
  { key: 'perceived_value', label: 'perceived value' },
  { key: 'ease_of_use', label: 'ease of use' },
]

export function QualityBarChart({
  dimensions,
}: {
  dimensions: QualityDimensions
}) {
  return (
    <dl className="space-y-2.5">
      {LABELS.map(({ key, label }) => {
        const score = dimensions[key]
        const pct = (score / 5) * 100
        return (
          <div key={key}>
            <div className="mb-1 flex items-baseline justify-between text-[11.5px]">
              <dt className="text-zinc-600">{label}</dt>
              <dd className="font-mono text-zinc-900 tabular-nums">
                {score.toFixed(1)}
                <span className="text-zinc-400">/5</span>
              </dd>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-zinc-900 transition-[width] duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </dl>
  )
}
