import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'

const ADMIN_EMAIL_DOMAIN = 'trygiftly.com'

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
  if (!user?.email) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/login?error=no_email', url.origin))
  }

  const email = user.email.toLowerCase()
  const isAdmin = email.endsWith(`@${ADMIN_EMAIL_DOMAIN}`)

  // Admin: same UX as before — drop them at `next` (default `/`, the admin
  // dashboard).
  if (isAdmin) {
    return NextResponse.redirect(new URL(next, url.origin))
  }

  // Not an admin → must be an admin-accepted creator. Match by either an
  // existing auth_user_id binding or by email (covers first-time bind via
  // Google/password before invite landed).
  const { data: creator } = await supabase
    .from('creators')
    .select('id, auth_user_id, invited_at')
    .or(`auth_user_id.eq.${user.id},email.eq.${email}`)
    .limit(1)
    .single()

  if (!creator || !creator.invited_at) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/login?error=not_authorized', url.origin))
  }

  // First-time bind path: creator exists + admin already clicked invite
  // (invited_at is set) but auth_user_id is null — happens if they sign in
  // via Google/password before clicking the magic link. Bind it now.
  if (!creator.auth_user_id) {
    await supabase
      .from('creators')
      .update({ auth_user_id: user.id })
      .eq('id', creator.id)
  }

  // Default destination for creators is the portal. Allow `next` override
  // when explicitly provided (e.g. inviteUserByEmail set next=/portal/creator).
  const creatorNext = next === '/' ? '/portal/creator' : next
  return NextResponse.redirect(new URL(creatorNext, url.origin))
}
