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

export async function markReceived(matchId: string) {
  const creator = await getCreatorForCurrentUser()
  if (!creator) return { ok: false as const, error: 'Not signed in.' }
  const supabase = await createClient()
  const { error } = await supabase
    .from('matches')
    .update({ stage: 'received', received_at: new Date().toISOString() })
    .eq('id', matchId)
    .eq('creator_id', creator.id)
    .eq('stage', 'accepted')
  if (error) return { ok: false as const, error: error.message }
  revalidatePath('/portal/creator')
  return { ok: true as const }
}

const declineAfterReceiptSchema = declineSchema // same shape

export async function declineAfterReceipt(
  input: z.infer<typeof declineAfterReceiptSchema>,
) {
  const creator = await getCreatorForCurrentUser()
  if (!creator) return { ok: false as const, error: 'Not signed in.' }
  const parsed = declineAfterReceiptSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid input.' }
  const supabase = await createClient()
  const { error } = await supabase
    .from('matches')
    .update({
      stage: 'declined_after_receipt',
      declined_at: new Date().toISOString(),
      decline_reason: parsed.data.reasons.join(', ') || null,
      decline_note: parsed.data.note || null,
    })
    .eq('id', parsed.data.matchId)
    .eq('creator_id', creator.id)
    .in('stage', ['accepted', 'received'])
  if (error) return { ok: false as const, error: error.message }
  revalidatePath('/portal/creator')
  return { ok: true as const }
}

export async function markStillTrying(matchId: string) {
  const creator = await getCreatorForCurrentUser()
  if (!creator) return { ok: false as const, error: 'Not signed in.' }
  const supabase = await createClient()
  const { error } = await supabase
    .from('matches')
    .update({ stage: 'still_trying' })
    .eq('id', matchId)
    .eq('creator_id', creator.id)
    .eq('stage', 'received')
  if (error) return { ok: false as const, error: error.message }
  revalidatePath('/portal/creator')
  return { ok: true as const }
}

// Limits mirrored from the eval-videos bucket (storage.buckets row).
// Bucket-level enforcement still applies; we check here too so the user
// sees a clean error rather than the bucket's opaque rejection.
const SUBMIT_LIMITS = {
  MAX_BYTES: 100 * 1024 * 1024,
  ALLOWED_MIMES: ['video/mp4', 'video/quicktime', 'video/webm'] as const,
}

const MIME_EXT: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
}

export async function submitEval(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const matchIdRaw = formData.get('matchId')
  const file = formData.get('file')

  // Validate file presence and shape before talking to Supabase.
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'Pick a video first.' }
  }
  if (typeof matchIdRaw !== 'string' || !matchIdRaw) {
    return { ok: false, error: 'Missing match id.' }
  }
  if (
    !file.type ||
    !SUBMIT_LIMITS.ALLOWED_MIMES.includes(
      file.type as (typeof SUBMIT_LIMITS.ALLOWED_MIMES)[number],
    )
  ) {
    return {
      ok: false,
      error: 'Unsupported file type. Use MP4, MOV, or WebM.',
    }
  }
  if (file.size > SUBMIT_LIMITS.MAX_BYTES) {
    return { ok: false, error: 'File is over the 100 MB limit.' }
  }

  const creator = await getCreatorForCurrentUser()
  if (!creator) return { ok: false, error: 'Not signed in.' }

  const supabase = await createClient()

  // Confirm the match exists, belongs to this creator, and is in the
  // 'received' stage. Doing this read-then-write isn't strictly atomic —
  // the stage update at the end uses an .eq('stage','received') guard so
  // concurrent submissions can't double-fire.
  const { data: match, error: matchErr } = await supabase
    .from('matches')
    .select('id, stage, creator_id')
    .eq('id', matchIdRaw)
    .eq('creator_id', creator.id)
    .single()
  if (matchErr || !match) {
    return { ok: false, error: 'Match not found.' }
  }
  if (match.stage !== 'received') {
    return {
      ok: false,
      error: "This eval isn't open right now.",
    }
  }

  // Object key convention: {match_id}/{uuid}.{ext}.
  // The bucket RLS policy keys off split_part(name, '/', 1) — diverging
  // from this prefix breaks the policy.
  const ext = MIME_EXT[file.type] ?? 'bin'
  const blobKey = `${match.id}/${crypto.randomUUID()}.${ext}`

  const { error: uploadErr } = await supabase.storage
    .from('eval-videos')
    .upload(blobKey, file, { contentType: file.type })
  if (uploadErr) {
    return { ok: false, error: uploadErr.message }
  }

  const { error: insertErr } = await supabase.from('eval_videos').insert({
    match_id: match.id,
    blob_key: blobKey,
    bytes: file.size,
    mime_type: file.type,
  })
  if (insertErr) {
    return { ok: false, error: insertErr.message }
  }

  const { error: updateErr } = await supabase
    .from('matches')
    .update({
      stage: 'eval_submitted',
      eval_submitted_at: new Date().toISOString(),
    })
    .eq('id', match.id)
    .eq('creator_id', creator.id)
    .eq('stage', 'received')
  if (updateErr) {
    return { ok: false, error: updateErr.message }
  }

  revalidatePath('/portal/creator')
  return { ok: true }
}
