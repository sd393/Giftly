'use client'

import { Clock, Heart, ThumbsDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import type { ActiveGiftFeedback, FeedbackChoice } from '../lib/types'

import { DeclineForm } from './decline-form'
import { PostSubmissionForm } from './post-submission-form'

type Choice = {
  id: FeedbackChoice
  label: string
  icon: typeof Heart
}

// UX-INTENT: these three options are deliberately equal-weight. Equal sizing,
// equal color treatment (cream button on coral hover, NOT one bright primary
// + two muted secondary), equal hierarchy. The "I don't love it" path being
// co-equal with the positive path is the entire UX thesis on the creator side
// — paid-influencer platforms hide the no behind a small text link; we show
// it the same as the yes. Do not "promote" the positive path.
const CHOICES: Choice[] = [
  { id: 'love', label: "I love it (I'll post)", icon: Heart },
  { id: 'pass', label: "I don't love it (here's why)", icon: ThumbsDown },
  { id: 'still-trying', label: 'Still trying it (check back in 14 days)', icon: Clock },
]

export function FeedbackFlow({
  feedback,
  onChange,
}: {
  feedback: ActiveGiftFeedback
  onChange: (next: ActiveGiftFeedback) => void
}) {
  const choice = feedback?.choice ?? null

  function pick(next: FeedbackChoice) {
    if (next === 'love') {
      onChange({
        choice: 'love',
        postUrl: feedback?.postUrl ?? '',
        contentType: feedback?.contentType ?? '',
        scheduledDate: feedback?.scheduledDate ?? '',
      })
    } else if (next === 'pass') {
      onChange({
        choice: 'pass',
        declineReasons: feedback?.declineReasons ?? [],
        declineNote: feedback?.declineNote ?? '',
      })
    } else {
      onChange({ choice: 'still-trying' })
    }
  }

  return (
    <div>
      <p className="text-[0.7rem] uppercase tracking-[0.15em] text-muted-warm font-medium mb-3">
        how is it going?
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {CHOICES.map(({ id, label, icon: Icon }) => {
          const active = choice === id
          return (
            <Button
              key={id}
              type="button"
              variant="outline"
              size="default"
              onClick={() => pick(id)}
              aria-pressed={active}
              // Identical styling across all three options. Selected state is
              // a coral ring + coral icon — no positive option gets a more
              // saturated treatment than the others.
              className={cn(
                'w-full h-auto py-5 px-5 flex flex-col items-center gap-3 text-center text-[0.9rem] font-medium leading-tight rounded-md',
                'bg-white border border-line/60 text-ink hover:bg-cream-warm hover:text-ink hover:-translate-y-0',
                active &&
                  'border-coral ring-2 ring-coral/40 bg-coral/5 hover:bg-coral/5'
              )}
            >
              <Icon
                aria-hidden="true"
                className={cn(
                  'size-6',
                  active ? 'text-coral' : 'text-ink-soft'
                )}
              />
              <span>{label}</span>
            </Button>
          )
        })}
      </div>

      {choice === 'love' ? (
        <PostSubmissionForm
          postUrl={feedback?.postUrl ?? ''}
          contentType={feedback?.contentType ?? ''}
          scheduledDate={feedback?.scheduledDate ?? ''}
          onChange={(patch) =>
            onChange({
              choice: 'love',
              postUrl: feedback?.postUrl ?? '',
              contentType: feedback?.contentType ?? '',
              scheduledDate: feedback?.scheduledDate ?? '',
              ...patch,
            })
          }
        />
      ) : null}

      {choice === 'pass' ? (
        <DeclineForm
          reasons={feedback?.declineReasons ?? []}
          note={feedback?.declineNote ?? ''}
          onChangeReasons={(next) =>
            onChange({
              choice: 'pass',
              declineReasons: next,
              declineNote: feedback?.declineNote ?? '',
            })
          }
          onChangeNote={(next) =>
            onChange({
              choice: 'pass',
              declineReasons: feedback?.declineReasons ?? [],
              declineNote: next,
            })
          }
        />
      ) : null}

      {choice === 'still-trying' ? (
        <div className="mt-4 border-t border-line/60 pt-4">
          <p className="text-[0.85rem] text-ink-soft leading-[1.55]">
            No rush. We&rsquo;ll check back in 14 days. If you change your
            mind earlier, jump back in here and pick a different answer.
          </p>
        </div>
      ) : null}
    </div>
  )
}
