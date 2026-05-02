'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

import { runExtractionAction } from '../_actions'

export function RunExtractionButton({
  matchId,
  label = 'run extraction',
}: {
  matchId: string
  label?: string
}) {
  const [pending, start] = useTransition()
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await runExtractionAction(matchId)
          if (r.ok) toast.success('extracted')
          else toast.error(r.error ?? 'extraction failed')
        })
      }
    >
      {pending ? 'extracting…' : label}
    </Button>
  )
}
