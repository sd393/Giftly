import 'server-only'

import { createClient } from '@supabase/supabase-js'

import type { Database } from './types'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secretKey = process.env.SUPABASE_SECRET_KEY

if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
if (!secretKey) throw new Error('SUPABASE_SECRET_KEY is not set')

/**
 * Server-only Supabase client using the secret key.
 *
 * The secret key bypasses RLS; never expose it to the browser. Supabase also
 * rejects requests from browser user-agents as an extra guardrail.
 */
export const supabaseAdmin = createClient<Database>(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    headers: { 'X-Client-Info': 'giftly-web/server' },
  },
})
