'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { markShippedAction } from '../_actions'

/**
 * Admin-side "mark shipped" affordance. Renders only on `accepted` matches.
 * Click expands an inline form with two optional fields (carrier + tracking
 * number); submit calls the server action.
 *
 * The fields are intentionally free-text `<input>` rather than a select —
 * a select would force us to maintain a carrier list, and the carrier value
 * is currently only displayed (no per-carrier link generation yet). When we
 * wire up real tracking-link generation we can swap this in.
 */
export function MarkShippedButton({ matchId }: { matchId: string }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [carrier, setCarrier] = useState('')
  const [number, setNumber] = useState('')

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        mark shipped
      </Button>
    )
  }

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const r = await markShippedAction(
            matchId,
            number || undefined,
            carrier || undefined,
          )
          if (r.ok) {
            toast.success('marked shipped')
            setOpen(false)
            setCarrier('')
            setNumber('')
          } else {
            toast.error(r.error ?? 'failed to mark shipped')
          }
        })
      }}
    >
      <Input
        type="text"
        placeholder="carrier (optional)"
        value={carrier}
        onChange={(e) => setCarrier(e.target.value)}
        disabled={pending}
        className="h-8 max-w-[180px] text-[0.8rem]"
      />
      <Input
        type="text"
        placeholder="tracking # (optional)"
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        disabled={pending}
        className="h-8 max-w-[200px] text-[0.8rem]"
      />
      <div className="flex gap-2">
        <Button size="sm" type="submit" disabled={pending}>
          {pending ? 'saving…' : 'confirm'}
        </Button>
        <Button
          size="sm"
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            setOpen(false)
            setCarrier('')
            setNumber('')
          }}
        >
          cancel
        </Button>
      </div>
    </form>
  )
}
