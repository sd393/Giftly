'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import { DECLINE_REASONS } from '../lib/mock-data'

export function DeclineForm({
  reasons,
  note,
  onChangeReasons,
  onChangeNote,
}: {
  reasons: string[]
  note: string
  onChangeReasons: (next: string[]) => void
  onChangeNote: (next: string) => void
}) {
  function toggle(reason: string, checked: boolean) {
    if (checked) {
      onChangeReasons(
        reasons.includes(reason) ? reasons : [...reasons, reason]
      )
    } else {
      onChangeReasons(reasons.filter((r) => r !== reason))
    }
  }

  return (
    <div className="mt-4 border-t border-line/60 pt-4 space-y-4">
      <p className="text-[0.7rem] uppercase tracking-[0.15em] text-muted-warm font-medium">
        what happened? (pick all that fit)
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
        {DECLINE_REASONS.map((reason) => {
          const id = `decline-${reason.replace(/\W+/g, '-')}`
          const checked = reasons.includes(reason)
          return (
            <Label
              key={reason}
              htmlFor={id}
              className="flex items-start gap-2 text-[0.85rem] text-ink-soft cursor-pointer"
            >
              <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={(v) => toggle(reason, Boolean(v))}
              />
              <span className="leading-[1.4]">{reason}</span>
            </Label>
          )
        })}
      </div>

      <div>
        <Label
          htmlFor="decline-note"
          className="text-[0.7rem] uppercase tracking-[0.15em] text-muted-warm font-medium"
        >
          additional context (optional)
        </Label>
        <Textarea
          id="decline-note"
          value={note}
          onChange={(e) => onChangeNote(e.target.value)}
          rows={3}
          placeholder="What would have made this better? Or what should we know about your hair/scalp?"
          className="mt-2"
        />
      </div>

      <p className="text-[0.75rem] text-muted-warm">
        Your honest answer here is data we use to match you better next time —
        and it&rsquo;s data the brand uses to fix the product. Your no is
        worth as much as a yes.
      </p>
    </div>
  )
}
