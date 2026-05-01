import 'server-only'

import { createClient } from '@/lib/supabase/server'

/**
 * Resolve the `creators` row bound to the current Supabase auth user, or
 * `null` if the user isn't signed in or hasn't been bound to a creator yet.
 *
 * Use this from Server Components, Server Actions, or Route Handlers under
 * `/portal/creator/*` to fetch the active creator alongside auth.
 */
export async function getCreatorForCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: creator } = await supabase
    .from('creators')
    .select('id, name, email, auth_user_id')
    .eq('auth_user_id', user.id)
    .single()
  return creator ?? null
}
