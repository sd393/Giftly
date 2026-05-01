'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

import { sendPortalInvite } from '../_actions'

export function SendInviteButton({
  creatorId,
  alreadyInvited,
}: {
  creatorId: string
  alreadyInvited: boolean
}) {
  const [pending, start] = useTransition()
  if (alreadyInvited) {
    return (
      <p className="text-[0.75rem] text-muted-warm">Portal invite sent.</p>
    )
  }
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await sendPortalInvite(creatorId)
          if (r.ok) toast.success('invite sent')
          else toast.error(r.error)
        })
      }
    >
      send portal invite
    </Button>
  )
}
