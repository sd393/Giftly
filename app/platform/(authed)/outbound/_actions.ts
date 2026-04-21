'use server'

import { revalidatePath } from 'next/cache'

import { promoteBrandToInTalks } from '@/lib/platform/brand-stage'
import {
  outboundMessageSchema,
  MESSAGE_STATUSES,
} from '@/lib/schemas/outbound'
import { createClient } from '@/lib/supabase/server'

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function logOutboundMessage(
  raw: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = outboundMessageSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not signed in' }

  const v = parsed.data
  const { data, error } = await supabase
    .from('outbound_messages')
    .insert({
      entity_type: v.entityType,
      entity_id: v.entityId,
      channel: v.channel,
      direction: v.direction,
      subject: v.subject ?? null,
      body: v.body,
      sender_account: v.senderAccount ?? null,
      status: v.status,
      external_id: v.externalId ?? null,
      sent_at: v.sentAt ?? new Date().toISOString(),
      created_by: 'user',
      created_by_id: user.id,
    })
    .select('id')
    .single()

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? 'Failed to log message',
    }
  }

  // Auto-promote cold brand → in_talks when we've logged a reply or a new
  // inbound. Failure here must not fail the whole action.
  if (
    v.entityType === 'brand' &&
    (v.direction === 'inbound' || v.status === 'replied')
  ) {
    await promoteBrandToInTalks(supabase, v.entityId)
  }

  revalidatePath('/outbound')
  revalidatePath(
    v.entityType === 'creator'
      ? `/creators/${v.entityId}`
      : `/brands/${v.entityId}`
  )
  return { success: true, data: { id: data.id } }
}

const STATUS_SET = new Set<string>(MESSAGE_STATUSES)

export async function updateMessageStatus(
  id: string,
  status: string
): Promise<ActionResult> {
  if (!STATUS_SET.has(status)) {
    return { success: false, error: 'Invalid status' }
  }

  const supabase = await createClient()
  const { error, data } = await supabase
    .from('outbound_messages')
    .update({
      status: status as (typeof MESSAGE_STATUSES)[number],
    })
    .eq('id', id)
    .select('entity_type, entity_id')
    .single()

  if (error || !data) {
    return { success: false, error: error?.message ?? 'Failed to update' }
  }

  if (status === 'replied' && data.entity_type === 'brand') {
    await promoteBrandToInTalks(supabase, data.entity_id)
  }

  revalidatePath('/outbound')
  revalidatePath(
    data.entity_type === 'creator'
      ? `/creators/${data.entity_id}`
      : `/brands/${data.entity_id}`
  )
  return { success: true, data: undefined }
}
