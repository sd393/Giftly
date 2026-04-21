'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

import { archiveCreator, markCreatorReviewed } from '../_actions'

export function CreatorStatusActions({
  id,
  reviewed,
  archived,
}: {
  id: string
  reviewed: boolean
  archived: boolean
}) {
  const [pending, startTransition] = useTransition()

  function run(action: () => Promise<{ success: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await action()
      if (!result.success) toast.error(result.error ?? 'failed')
    })
  }

  return (
    <div className="flex items-center gap-2">
      {!archived ? (
        <Button
          size="sm"
          variant={reviewed ? 'outline' : 'primary'}
          disabled={pending}
          onClick={() => run(() => markCreatorReviewed(id, !reviewed))}
        >
          {reviewed ? 'mark unreviewed' : 'mark reviewed'}
        </Button>
      ) : null}
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => run(() => archiveCreator(id, !archived))}
      >
        {archived ? 'unarchive' : 'archive'}
      </Button>
    </div>
  )
}
