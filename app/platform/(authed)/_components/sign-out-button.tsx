'use client'

import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

import { createClient } from '@/lib/supabase/client'

export function SignOutButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <button
      type="button"
      aria-label="sign out"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const supabase = createClient()
          await supabase.auth.signOut()
          router.push('/login')
          router.refresh()
        })
      }
      className="shrink-0 inline-flex items-center justify-center h-6 w-6 rounded text-muted-warm transition-all duration-150 hover:text-red-500 hover:[filter:drop-shadow(0_0_6px_rgba(239,68,68,0.7))] disabled:opacity-50"
    >
      <LogOut className="h-3.5 w-3.5" />
    </button>
  )
}
