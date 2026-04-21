import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'

const ALLOWED_EMAIL_DOMAIN = 'trygiftly.com'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const rawNext = url.searchParams.get('next') ?? '/'
  const next = rawNext.startsWith('/') ? rawNext : '/'

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', url.origin))
  }

  const supabase = await createClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
    code
  )
  if (exchangeError) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, url.origin)
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email?.toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/login?error=domain', url.origin))
  }

  return NextResponse.redirect(new URL(next, url.origin))
}
