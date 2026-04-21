import { NextResponse, type NextRequest } from 'next/server'

import { createMiddlewareClient } from '@/lib/supabase/middleware'

const ALLOWED_EMAIL_DOMAIN = 'trygiftly.com'

const PUBLIC_PLATFORM_PATHS = new Set([
  '/login',
  '/auth/callback',
  '/auth/signout',
])

function isPlatformHost(host: string | null): boolean {
  if (!host) return false
  const h = host.toLowerCase().split(':')[0]
  return h === 'app.trygiftly.com' || h === 'app.localhost' || h.startsWith('app.')
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host')
  const isPlatform = isPlatformHost(host)

  // Agent API endpoints use bearer-token auth, not Supabase session cookies.
  // Let them through on either host with no rewrite.
  if (pathname === '/api' || pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Marketing host: block accidental access to /platform/* internals.
  if (!isPlatform) {
    if (pathname === '/platform' || pathname.startsWith('/platform/')) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  // Platform host: rewrite every request into the /platform/* tree.
  const rewrittenPath =
    pathname === '/' ? '/platform' : `/platform${pathname}`
  const rewriteUrl = request.nextUrl.clone()
  rewriteUrl.pathname = rewrittenPath

  // Touch the Supabase session on every request so cookies stay fresh.
  const { supabase, response } = createMiddlewareClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Public platform paths (login, OAuth callback) skip the auth gate.
  if (PUBLIC_PLATFORM_PATHS.has(pathname)) {
    const res = NextResponse.rewrite(rewriteUrl)
    for (const cookie of response().cookies.getAll()) {
      res.cookies.set(cookie)
    }
    return res
  }

  if (!user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const email = user.email?.toLowerCase() ?? ''
  if (!email.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
    // Sign the non-allowlisted user out server-side, then bounce to login.
    await supabase.auth.signOut()
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('error', 'domain')
    const res = NextResponse.redirect(loginUrl)
    for (const cookie of response().cookies.getAll()) {
      res.cookies.set(cookie)
    }
    return res
  }

  const res = NextResponse.rewrite(rewriteUrl)
  for (const cookie of response().cookies.getAll()) {
    res.cookies.set(cookie)
  }
  return res
}

export const config = {
  matcher: [
    // All paths except Next internals and static assets.
    '/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|.*\\..*).*)',
  ],
}
