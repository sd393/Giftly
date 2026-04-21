'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

import { promoteBrandToDirectory } from '../_actions'

export function BrandDirectoryButton({ id }: { id: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const result = await promoteBrandToDirectory(id)
      if (!result.success) {
        toast.error(result.error ?? 'failed')
        return
      }
      toast.success('added to directory')
      router.refresh()
    })
  }

  return (
    <Button size="sm" disabled={pending} onClick={handleClick}>
      {pending ? 'adding…' : 'add to directory'}
    </Button>
  )
}
