'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const dmSchema = z.object({
  recipient: z.string().trim().min(1).max(160),
  thread_folder: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(20000),
  ig_message_id: z.string().trim().min(1).max(250),
  sent_at: z.string().datetime().optional(),
  sender_account: z.string().trim().min(1).max(250),
  source_tag: z.string().trim().min(1).max(60),
})

const importPayloadSchema = z.object({
  dms: z.array(dmSchema).max(5000),
})

export type DMInput = z.infer<typeof dmSchema>

export type ImportResult = {
  ok: number
  skipped_dup: number
  failed: number
  errors: string[]
}

const SYNTHETIC_EMAIL_DOMAIN = 'prospect.giftly.internal'

function syntheticEmail(threadFolder: string): string {
  const slug = threadFolder.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase()
  return `ig_${slug}@${SYNTHETIC_EMAIL_DOMAIN}`
}

async function assertTeamUser(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return { ok: false, error: 'not_authenticated' }
  if (!user.email?.toLowerCase().endsWith('@trygiftly.com')) {
    return { ok: false, error: 'not_team' }
  }
  return { ok: true, userId: user.id }
}

export async function importInstagramDMs(
  raw: unknown
): Promise<
  { success: true; data: ImportResult } | { success: false; error: string }
> {
  const auth = await assertTeamUser()
  if (!auth.ok) return { success: false, error: auth.error }

  const parsed = importPayloadSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? 'invalid input',
    }
  }
  const dms = parsed.data.dms

  // Pre-fetch all existing instagram external_ids for dedup. Paginate in 1000s.
  const existingExternalIds = new Set<string>()
  let offset = 0
  const page = 1000
  while (true) {
    const { data, error: fetchErr } = await supabaseAdmin
      .from('outbound_messages')
      .select('external_id')
      .eq('channel', 'instagram')
      .not('external_id', 'is', null)
      .range(offset, offset + page - 1)
    if (fetchErr) return { success: false, error: fetchErr.message }
    if (!data || data.length === 0) break
    for (const row of data) {
      if (row.external_id) existingExternalIds.add(row.external_id)
    }
    if (data.length < page) break
    offset += page
  }

  const result: ImportResult = { ok: 0, skipped_dup: 0, failed: 0, errors: [] }

  for (const dm of dms) {
    if (existingExternalIds.has(dm.ig_message_id)) {
      result.skipped_dup++
      continue
    }

    const email = syntheticEmail(dm.thread_folder)

    // Upsert creator by synthetic email.
    let creatorId: string | null = null
    try {
      const { data: existing, error: lookupErr } = await supabaseAdmin
        .from('creators')
        .select('id')
        .eq('email', email)
        .maybeSingle()
      if (lookupErr) throw new Error(lookupErr.message)
      if (existing) {
        creatorId = existing.id
      } else {
        const { data: inserted, error: insertErr } = await supabaseAdmin
          .from('creators')
          .insert({
            name: dm.recipient,
            email,
            platform: 'Instagram',
            social_handles: `IG thread: ${dm.thread_folder}`,
            notes: 'Imported from Instagram DM export',
            source: 'outreach',
          })
          .select('id')
          .single()
        if (insertErr || !inserted) throw new Error(insertErr?.message ?? 'creator insert failed')
        creatorId = inserted.id
      }
    } catch (err) {
      result.failed++
      result.errors.push(
        `creator ${dm.recipient}: ${err instanceof Error ? err.message : String(err)}`
      )
      continue
    }

    try {
      const insertPayload = {
        entity_type: 'creator' as const,
        entity_id: creatorId,
        channel: 'instagram',
        direction: 'outbound' as const,
        body: dm.body,
        sender_account: dm.sender_account,
        status: 'sent' as const,
        external_id: dm.ig_message_id,
        ...(dm.sent_at ? { sent_at: dm.sent_at } : {}),
        created_by: 'user' as const,
        created_by_id: auth.userId,
        metadata: {
          source: 'instagram_dm_export',
          account: dm.source_tag,
          thread_folder: dm.thread_folder,
          imported_via: 'platform_ui',
        },
      }
      const { error: msgErr } = await supabaseAdmin
        .from('outbound_messages')
        .insert(insertPayload)
      if (msgErr) throw new Error(msgErr.message)
      existingExternalIds.add(dm.ig_message_id) // defend against dupes within same batch
      result.ok++
    } catch (err) {
      result.failed++
      result.errors.push(
        `message ${dm.recipient}: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  revalidatePath('/outbound')
  revalidatePath('/creators')
  return { success: true, data: result }
}
