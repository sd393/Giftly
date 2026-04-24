'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import {
  creatorEditSchema,
  type CreatorEditValues,
} from '@/lib/schemas/creator'
import { createClient } from '@/lib/supabase/server'

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

function toInsertPayload(v: CreatorEditValues) {
  return {
    name: v.name,
    email: v.email,
    social_handles: v.socialHandles ?? null,
    platform: v.platform ?? null,
    followers: v.followers ?? null,
    niches: v.niches,
    product_interests: v.productInterests ?? null,
    content_link: v.contentLink ?? null,
    shipping_address: v.shippingAddress ?? null,
    notes: v.notes ?? null,
    owner_id: v.ownerId,
  }
}

export async function createCreator(
  raw: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = creatorEditSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('creators')
    .insert({ ...toInsertPayload(parsed.data), source: 'manual' })
    .select('id')
    .single()

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? 'Failed to create creator',
    }
  }

  revalidatePath('/creators')
  return { success: true, data: { id: data.id } }
}

export async function updateCreator(
  id: string,
  raw: unknown
): Promise<ActionResult> {
  const parsed = creatorEditSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('creators')
    .update(toInsertPayload(parsed.data))
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/creators')
  revalidatePath(`/creators/${id}`)
  return { success: true, data: undefined }
}

export async function updateCreatorNotes(
  id: string,
  notes: string
): Promise<ActionResult> {
  if (notes.length > 5000) {
    return { success: false, error: 'Notes are too long' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('creators')
    .update({ notes: notes.length > 0 ? notes : null })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/creators/${id}`)
  return { success: true, data: undefined }
}

export async function markCreatorReviewed(
  id: string,
  reviewed: boolean
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('creators')
    .update({ reviewed_at: reviewed ? new Date().toISOString() : null })
    .eq('id', id)
    .select('id')

  if (error) {
    console.error('[markCreatorReviewed]', error)
    return { success: false, error: error.message }
  }
  if (!data || data.length === 0) {
    return { success: false, error: 'Creator not found or not editable' }
  }

  revalidatePath('/creators')
  revalidatePath('/')
  revalidatePath(`/creators/${id}`)
  return { success: true, data: undefined }
}

export async function archiveCreator(
  id: string,
  archive: boolean
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('creators')
    .update({ archived_at: archive ? new Date().toISOString() : null })
    .eq('id', id)
    .select('id')

  if (error) {
    console.error('[archiveCreator]', error)
    return { success: false, error: error.message }
  }
  if (!data || data.length === 0) {
    return { success: false, error: 'Creator not found or not editable' }
  }

  revalidatePath('/creators')
  revalidatePath(`/creators/${id}`)
  return { success: true, data: undefined }
}

export async function createCreatorAndRedirect(raw: unknown): Promise<void> {
  const result = await createCreator(raw)
  if (!result.success) {
    throw new Error(result.error)
  }
  redirect(`/creators/${result.data.id}`)
}
