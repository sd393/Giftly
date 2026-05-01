'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getCreatorForCurrentUser } from '@/lib/portal/auth'
import { createClient } from '@/lib/supabase/server'

export async function acceptOffer(matchId: string) {
  const creator = await getCreatorForCurrentUser()
  if (!creator) return { ok: false as const, error: 'Not signed in.' }
  const supabase = await createClient()
  const { error } = await supabase
    .from('matches')
    .update({ stage: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', matchId)
    .eq('creator_id', creator.id)
    .eq('stage', 'proposed')
  if (error) return { ok: false as const, error: error.message }
  revalidatePath('/portal/creator')
  return { ok: true as const }
}

const declineSchema = z.object({
  matchId: z.string().uuid(),
  reasons: z.array(z.string()).max(8),
  note: z.string().max(2000).optional().default(''),
})

export async function declineOffer(input: z.infer<typeof declineSchema>) {
  const creator = await getCreatorForCurrentUser()
  if (!creator) return { ok: false as const, error: 'Not signed in.' }
  const parsed = declineSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid input.' }
  const supabase = await createClient()
  const { error } = await supabase
    .from('matches')
    .update({
      stage: 'declined',
      declined_at: new Date().toISOString(),
      decline_reason: parsed.data.reasons.join(', ') || null,
      decline_note: parsed.data.note || null,
    })
    .eq('id', parsed.data.matchId)
    .eq('creator_id', creator.id)
    .eq('stage', 'proposed')
  if (error) return { ok: false as const, error: error.message }
  revalidatePath('/portal/creator')
  return { ok: true as const }
}
