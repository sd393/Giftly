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
      title="sign out"
      className="shrink-0 inline-flex items-center justify-center h-7 w-7 rounded text-ink-soft transition-all duration-150 hover:text-red-500 hover:[filter:drop-shadow(0_0_8px_rgba(239,68,68,0.8))] disabled:opacity-50"
    >
      <LogOut className="h-4 w-4" />
    </button>
  )
}
