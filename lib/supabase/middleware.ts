import 'server-only'

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import type { Database } from './types'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

/**
 * Build a Supabase client bound to the middleware request/response cycle.
 * Caller owns the returned `response` — mutate it, then return it from the
 * middleware so cookie refreshes reach the browser.
 */
export function createMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({ request })

  if (!url || !publishableKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set'
    )
  }

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  return { supabase, response: () => response }
}
