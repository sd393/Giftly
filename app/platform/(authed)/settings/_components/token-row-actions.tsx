'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

import { revokeApiToken } from '../_actions'

export function TokenRowActions({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()

  function handleRevoke() {
    if (!confirm('Revoke this token? Any agent using it will fail.')) return
    startTransition(async () => {
      const result = await revokeApiToken(id)
      if (!result.success) {
        toast.error(result.error ?? 'failed')
        return
      }
      toast.success('revoked')
    })
  }

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={handleRevoke}
    >
      revoke
    </Button>
  )
}
