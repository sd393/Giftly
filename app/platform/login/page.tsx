import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

import { LoginForm } from './_components/login-form'

function resolveErrorMessage(
  error: string | undefined,
  unbound: string | undefined
): string | null {
  if (unbound === '1') {
    return "we don't recognize this account as a creator yet. if you applied recently, hang tight — we review each application before sending an invite."
  }
  switch (error) {
    case 'not_authorized':
      return "this email isn't authorized. if you applied as a creator, hang tight — we review each application before sending an invite."
    case 'no_email':
      return 'sign-in succeeded but no email was attached. try a different provider.'
    case 'missing_code':
      return 'auth code missing. try the sign-in flow again.'
    case 'domain':
      // Legacy from when only admins could sign in. Keep the copy generic.
      return 'this email is not allowed.'
    case undefined:
      return null
    default:
      return `something went wrong: ${error}`
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; unbound?: string }>
}) {
  const { next, error, unbound } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Admin already signed in → send them through to the requested admin path
  // (or the dashboard root). Creators handle their own session check via
  // the portal layout / proxy gate.
  if (user && user.email?.toLowerCase().endsWith('@trygiftly.com')) {
    redirect(next && next.startsWith('/') ? next : '/')
  }

  const errorMessage = resolveErrorMessage(error, unbound)

  return (
    <main className="min-h-screen flex items-center justify-center bg-cream px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="font-display text-[1.75rem] tracking-tight">
            giftly
          </Link>
        </div>
        <div className="bg-white border border-line/60 rounded-md p-6 shadow-sm">
          <h1 className="font-display text-[1.25rem] tracking-tight mb-1">
            sign in
          </h1>
          <p className="text-[0.8rem] text-muted-warm mb-5">
            admin tool + creator portal.
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
