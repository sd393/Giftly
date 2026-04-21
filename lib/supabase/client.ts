'use client'

import { createBrowserClient } from '@supabase/ssr'

import type { Database } from './types'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
if (!publishableKey)
  throw new Error('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set')

export function createClient() {
  return createBrowserClient<Database>(url!, publishableKey!)
}
