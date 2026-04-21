import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

import { LoginForm } from './_components/login-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const { next, error } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Allowlisted user already signed in → send them through.
  if (user && user.email?.toLowerCase().endsWith('@trygiftly.com')) {
    redirect(next && next.startsWith('/') ? next : '/')
  }

  const errorMessage =
    error === 'domain'
      ? 'Only @trygiftly.com emails can sign in here.'
      : null

  return (
    <main className="min-h-screen flex items-center justify-center bg-cream px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="font-display text-[1.75rem] tracking-tight">
            giftly
          </Link>
          <p className="mt-1 text-[0.75rem] uppercase tracking-[0.18em] text-muted-warm">
            internal
          </p>
        </div>
        <div className="bg-white border border-line/60 rounded-md p-6 shadow-sm">
          <h1 className="font-display text-[1.25rem] tracking-tight mb-1">
            sign in
          </h1>
          <p className="text-[0.8rem] text-muted-warm mb-5">
            only @trygiftly.com emails.
          </p>
          {errorMessage ? (
            <div className="mb-4 rounded-md border border-coral/30 bg-coral/5 px-3 py-2 text-[0.8rem] text-coral-deep">
              {errorMessage}
            </div>
          ) : null}
          <LoginForm next={next} />
        </div>
      </div>
    </main>
  )
}
