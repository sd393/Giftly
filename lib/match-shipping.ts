import 'server-only'

import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Mark a match as shipped. Admin-side action — uses `supabaseAdmin` so RLS
 * doesn't apply, and guards on `stage='accepted'` so we can't double-flip
 * an already-shipped or otherwise-progressed match.
 *
 * Lives here (not inline in the admin server action) so the brand portal
 * can reuse the exact same transition when brands gain self-serve shipping
 * marking. The wrapping server action is responsible for revalidation.
 *
 * Tracking fields are optional. If the admin doesn't supply them, the row
 * still flips to `shipped` and the UI just shows "in transit" without a
 * subtitle. Empty strings are coerced to null so the columns don't get
 * polluted with `''`.
 */
export async function markMatchShipped(
  matchId: string,
  opts: { trackingNumber?: string; trackingCarrier?: string } = {},
): Promise<{ ok: boolean; error?: string }> {
  const trackingNumber = opts.trackingNumber?.trim() || null
  const trackingCarrier = opts.trackingCarrier?.trim() || null

  // Confirm the match is in `accepted` first. Doing this read-then-write
  // isn't strictly atomic — the update below uses an .eq('stage','accepted')
  // guard so a concurrent update can't race it past us, but the explicit
  // read gives us a clean error message rather than a silent zero-rows.
  const { data: match, error: loadErr } = await supabaseAdmin
    .from('matches')
    .select('id, stage')
    .eq('id', matchId)
    .single()
  if (loadErr || !match) {
    return { ok: false, error: 'Match not found.' }
  }
  if (match.stage !== 'accepted') {
    return {
      ok: false,
      error: `Match is at stage "${match.stage}", expected "accepted".`,
    }
  }

  const { error: updateErr } = await supabaseAdmin
    .from('matches')
    .update({
      stage: 'shipped',
      shipped_at: new Date().toISOString(),
      tracking_number: trackingNumber,
      tracking_carrier: trackingCarrier,
    })
    .eq('id', matchId)
    .eq('stage', 'accepted')
  if (updateErr) {
    return { ok: false, error: updateErr.message }
  }
  return { ok: true }
}
