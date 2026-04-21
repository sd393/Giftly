'use client'

import { useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Textarea } from '@/components/ui/textarea'

import { updateCreatorNotes } from '../_actions'

export function CreatorNotes({
  id,
  initial,
}: {
  id: string
  initial: string
}) {
  const [value, setValue] = useState(initial)
  const [pending, startTransition] = useTransition()
  const lastSavedRef = useRef(initial)
  const [dirty, setDirty] = useState(false)

  function handleBlur() {
    if (value === lastSavedRef.current) {
      setDirty(false)
      return
    }
    startTransition(async () => {
      const result = await updateCreatorNotes(id, value)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      lastSavedRef.current = value
      setDirty(false)
    })
  }

  return (
    <div className="space-y-2">
      <Textarea
        rows={6}
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setDirty(true)
        }}
        onBlur={handleBlur}
        placeholder="internal notes — saved automatically when you click out"
        className="bg-white"
      />
      <p className="text-[0.7rem] text-muted-warm">
        {pending ? 'saving…' : dirty ? 'unsaved changes' : 'saved'}
      </p>
    </div>
  )
}
