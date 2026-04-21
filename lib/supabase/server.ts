import 'server-only'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import type { Database } from './types'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
if (!publishableKey)
  throw new Error('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set')

/**
 * Cookie-based server client bound to the incoming request's session.
 * Use this from Server Components, Route Handlers, and Server Actions
 * whenever you need the current user's identity.
 *
 * For writes that must bypass RLS, use `supabaseAdmin` from `./admin`.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(url!, publishableKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Called from a Server Component — cookies are read-only there.
          // The middleware client refreshes the session, so this is safe to ignore.
        }
      },
    },
  })
}
