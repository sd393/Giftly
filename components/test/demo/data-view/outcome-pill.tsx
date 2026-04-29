import { cn } from '@/lib/utils'

import type { MatchOutcome } from '../lib/types'

const TONES: Record<MatchOutcome, { label: string; classes: string }> = {
  'posted-positive': {
    label: 'Posted (positive)',
    classes: 'bg-coral text-cream',
  },
  'posted-with-caveats': {
    label: 'Posted (with caveats)',
    classes: 'bg-peach text-ink-soft',
  },
  'accepted-no-post': {
    label: 'Accepted, no post',
    classes: 'bg-cream-warm text-muted-warm border border-line/60',
  },
  'declined-at-offer': {
    label: 'Declined at offer',
    classes: 'bg-line/40 text-ink-soft',
  },
}

export function OutcomePill({ outcome }: { outcome: MatchOutcome }) {
  const { label, classes } = TONES[outcome]
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[0.7rem] font-medium tracking-tight whitespace-nowrap',
        classes
      )}
    >
      {label}
    </span>
  )
}
