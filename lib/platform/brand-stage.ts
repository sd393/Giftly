import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase/types'

type Client = SupabaseClient<Database>

/**
 * Promote a brand from `cold` → `in_talks`. Intentionally a no-op if the
 * brand is already `in_talks` or `done`, so a late-arriving reply can't
 * resurrect a closed thread and a repeat reply can't clobber a manual
 * `done`. Caller passes whichever client (session or admin) matches their
 * transport.
 */
export async function promoteBrandToInTalks(
  supabase: Client,
  brandId: string
): Promise<void> {
  const { error } = await supabase
    .from('brands')
    .update({ stage: 'in_talks' })
    .eq('id', brandId)
    .eq('stage', 'cold')

  if (error) {
    console.error('[brand-stage] promote failed', brandId, error.message)
  }
}
