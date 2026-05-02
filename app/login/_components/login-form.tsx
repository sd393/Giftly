'use client'

import { Loader2 } from 'lucide-react'
import { useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

type Props = {
  /** Path the magic link should land on after auth. Already validated to start with `/`. */
  next: string
}

export function LoginForm({ next }: Props) {
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMessage(null)

    const trimmed = email.trim()
    if (!trimmed) {
      setErrorMessage('enter your email above.')
      return
    }

    startTransition(async () => {
      const supabase = createClient()
      // Supabase Auth requires an absolute URL for emailRedirectTo. Build it
      // from the current origin so dev (localhost) and prod both work.
      const redirectTo = `${window.location.origin}${next}`
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: redirectTo },
      })
      if (error) {
        setErrorMessage(error.message)
        return
      }
      setSentTo(trimmed)
    })
  }

  if (sentTo) {
    return (
      <div className="space-y-3">
        <p className="text-[0.95rem] text-ink">
          check{' '}
          <span className="font-medium">{sentTo}</span>
          .
        </p>
        <p className="text-[0.85rem] text-muted-warm">
          click the magic link in that email to sign in. no password required.
        </p>
        <button
          type="button"
          onClick={() => {
            setSentTo(null)
            setErrorMessage(null)
          }}
          className="text-[0.75rem] text-muted-warm underline underline-offset-2 hover:text-coral transition-colors"
        >
          use a different email
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-[0.8rem]">
          email
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={pending}
        />
      </div>
      {errorMessage ? (
        <p className="text-[0.8rem] text-coral-deep">{errorMessage}</p>
      ) : null}
      <Button type="submit" className="w-full h-10" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            sending…
          </>
        ) : (
          'send magic link'
        )}
      </Button>
    </form>
  )
}
