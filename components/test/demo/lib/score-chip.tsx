import { cn } from '@/lib/utils'

// Color logic lifted from the original records-view so the extractions view
// and the product-matrix view share one source of truth for score colors.
export function scoreTone(score: number): string {
  if (score >= 5) return 'text-emerald-700'
  if (score >= 4) return 'text-emerald-700/80'
  if (score >= 3) return 'text-amber-700'
  return 'text-rose-700'
}

export function ScoreChip({
  score,
  label,
  className,
}: {
  score: number
  label?: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-baseline gap-1 font-mono text-[0.78rem] tabular-nums',
        className
      )}
    >
      {label ? <span className="text-muted-warm/70">{label}</span> : null}
      <span className={scoreTone(score)}>{score}/5</span>
    </span>
  )
}

// Confidence dot — green/amber/rose based on 0–1 confidence value.
export function ConfidenceDot({ confidence }: { confidence: number }) {
  const tone =
    confidence >= 0.8
      ? 'bg-emerald-500'
      : confidence >= 0.5
        ? 'bg-amber-500'
        : 'bg-rose-500'
  return (
    <span
      aria-label={`confidence ${Math.round(confidence * 100)}%`}
      className={cn('inline-block size-1.5 rounded-full', tone)}
    />
  )
}
