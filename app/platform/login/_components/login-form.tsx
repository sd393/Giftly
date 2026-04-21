'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

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
