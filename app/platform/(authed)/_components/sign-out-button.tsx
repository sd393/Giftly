'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function SignOutButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full justify-start text-[0.8rem]"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const supabase = createClient()
          await supabase.auth.signOut()
          router.replace('/login')
          router.refresh()
        })
      }
    >
      {pending ? 'signing out…' : 'sign out'}
    </Button>
  )
}
