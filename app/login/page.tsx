import Link from 'next/link'

import { LoginForm } from './_components/login-form'

type LoginSearchParams = {
  next?: string
  unbound?: string
  error?: string
}

function resolveMessage({
  unbound,
  error,
}: {
  unbound?: string
  error?: string
}): string | null {
  if (unbound === '1') {
    return "we don't recognize this account as a creator yet. if you applied recently, hang tight — admin reviews each application before sending an invite."
  }
  if (error === 'domain') {
    // Set on platform-side; shouldn't normally hit here. Ignore silently
    // rather than confusing creators with platform-team copy.
    return null
  }
  if (error) {
    return `something went wrong: ${error}`
  }
  return null
}

export default async function CreatorLoginPage({
  searchParams,
}: {
  searchParams: Promise<LoginSearchParams>
}) {
  const { next, unbound, error } = await searchParams

  const safeNext = next && next.startsWith('/') ? next : '/portal/creator'
  const message = resolveMessage({ unbound, error })

  return (
    <main className="min-h-screen flex items-center justify-center bg-cream px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="font-display text-[1.75rem] tracking-tight"
          >
            giftly
          </Link>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-warm font-medium">
            creator portal
          </p>
        </div>
        <div className="bg-white/90 backdrop-blur-xl p-7 md:p-10 rounded-card-sm">
          <h1 className="font-display text-[1.75rem] tracking-tight">
            sign in
          </h1>
          <p className="mt-2 text-[0.85rem] text-muted-warm">
            enter your email and we&rsquo;ll send a magic link. no password
            required.
          </p>
          {message ? (
            <div className="mt-5 rounded-md border border-coral/30 bg-coral/5 px-3 py-2 text-[0.8rem] text-coral-deep">
              {message}
            </div>
          ) : null}
          <div className="mt-6">
            <LoginForm next={safeNext} />
          </div>
          <p className="mt-6 text-[0.75rem] text-muted-warm">
            wrong email or stuck?{' '}
            <a
              href="mailto:samarjit.deshmukh.29@dartmouth.edu"
              className="underline underline-offset-2 hover:text-coral transition-colors"
            >
              contact support
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  )
}
