'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function sendPortalInvite(creatorId: string) {
  const supabase = await createClient()
  const { data: creator, error: loadErr } = await supabase
    .from('creators')
    .select('id, email, auth_user_id')
    .eq('id', creatorId)
    .single()
  if (loadErr || !creator) {
    return { ok: false as const, error: 'Creator not found.' }
  }
  if (creator.auth_user_id) {
    return { ok: false as const, error: 'Creator already invited.' }
  }
  const { data: invite, error: inviteErr } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(creator.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/portal/creator`,
    })
  if (inviteErr || !invite?.user) {
    return { ok: false as const, error: inviteErr?.message ?? 'Invite failed.' }
  }
  const { error: bindErr } = await supabase
    .from('creators')
    .update({
      auth_user_id: invite.user.id,
      invited_at: new Date().toISOString(),
    })
    .eq('id', creatorId)
  if (bindErr) {
    return { ok: false as const, error: bindErr.message }
  }
  return { ok: true as const }
}
