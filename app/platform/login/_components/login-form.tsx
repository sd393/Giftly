'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 18 18"
      className="size-4"
      fill="none"
    >
      <path
        d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4818h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.6154z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.4673-.806 5.9564-2.1818l-2.9087-2.2581c-.8059.54-1.8368.8591-3.0477.8591-2.3441 0-4.3282-1.5832-5.0359-3.7104H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.9641 10.71c-.18-.54-.2823-1.1168-.2823-1.71s.1023-1.17.2823-1.71V4.9582H.9573C.3477 6.1732 0 7.5477 0 9c0 1.4523.3477 2.8268.9573 4.0418l3.0068-2.3318z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.5795c1.3214 0 2.5077.4545 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.4259 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.9641 7.29C4.6718 5.1627 6.6559 3.5795 9 3.5795z"
        fill="#EA4335"
      />
    </svg>
  )
}

export function LoginForm({ next }: { next?: string }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pendingGoogle, startGoogle] = useTransition()
  const [pendingPassword, startPassword] = useTransition()
  const [resetPending, startReset] = useTransition()

  const safeNext = next && next.startsWith('/') ? next : '/'

  function handleGoogle() {
    startGoogle(async () => {
      const supabase = createClient()
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: { prompt: 'select_account' },
        },
      })
      if (error) toast.error(error.message)
    })
  }

  function handlePassword(e: React.FormEvent) {
    e.preventDefault()
    startPassword(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        toast.error(error.message)
        return
      }
      window.location.assign(safeNext)
    })
  }

  function handleReset() {
    if (!email) {
      toast.error('Enter your email first, then hit reset.')
      return
    }
    startReset(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
      })
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success('Check your email for a reset link.')
    })
  }

  return (
    <div className="space-y-5">
      <Button
        type="button"
        variant="outline"
        className="w-full h-10"
        onClick={handleGoogle}
        disabled={pendingGoogle}
      >
        <GoogleIcon />
        {pendingGoogle ? 'redirecting…' : 'continue with google'}
      </Button>

      <div className="relative flex items-center">
        <span className="flex-1 h-px bg-line/60" />
        <span className="px-3 text-[0.7rem] uppercase tracking-[0.15em] text-muted-warm">
          or
        </span>
        <span className="flex-1 h-px bg-line/60" />
      </div>

      <form onSubmit={handlePassword} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-[0.8rem]">
            email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-[0.8rem]">
              password
            </Label>
            <button
              type="button"
              onClick={handleReset}
              disabled={resetPending}
              className="text-[0.7rem] text-muted-warm hover:text-ink transition-colors"
            >
              {resetPending ? 'sending…' : 'forgot?'}
            </button>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          className="w-full h-10"
          disabled={pendingPassword}
        >
          {pendingPassword ? 'signing in…' : 'sign in with password'}
        </Button>
      </form>
    </div>
  )
}
