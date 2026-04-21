'use server'

import { revalidatePath } from 'next/cache'

import {
  BRAND_STAGES,
  brandEditSchema,
  brandStageSchema,
  type BrandEditValues,
  type BrandStage,
} from '@/lib/schemas/brand'
import { createClient } from '@/lib/supabase/server'

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

function toPayload(v: BrandEditValues) {
  const base = {
    contact_name: v.contactName,
    contact_role: v.contactRole ?? null,
    contact_email: v.contactEmail,
    brand_name: v.brandName,
    website: v.website,
    category: v.category ?? null,
    product_description: v.productDescription ?? null,
    notes: v.notes ?? null,
    owner_id: v.ownerId,
  }
  return v.stage ? { ...base, stage: v.stage } : base
}

export async function createBrand(
  raw: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = brandEditSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('brands')
    .insert({ ...toPayload(parsed.data), source: 'manual' })
    .select('id')
    .single()

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? 'Failed to create brand',
    }
  }

  revalidatePath('/brands')
  return { success: true, data: { id: data.id } }
}

export async function updateBrand(
  id: string,
  raw: unknown
): Promise<ActionResult> {
  const parsed = brandEditSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('brands')
    .update(toPayload(parsed.data))
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/brands')
  revalidatePath(`/brands/${id}`)
  return { success: true, data: undefined }
}

export async function updateBrandNotes(
  id: string,
  notes: string
): Promise<ActionResult> {
  if (notes.length > 5000) {
    return { success: false, error: 'Notes are too long' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('brands')
    .update({ notes: notes.length > 0 ? notes : null })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/brands/${id}`)
  return { success: true, data: undefined }
}

export async function markBrandReviewed(
  id: string,
  reviewed: boolean
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('brands')
    .update({ reviewed_at: reviewed ? new Date().toISOString() : null })
    .eq('id', id)
    .select('id')

  if (error) {
    console.error('[markBrandReviewed]', error)
    return { success: false, error: error.message }
  }
  if (!data || data.length === 0) {
    return { success: false, error: 'Brand not found or not editable' }
  }

  revalidatePath('/brands')
  revalidatePath('/')
  revalidatePath(`/brands/${id}`)
  return { success: true, data: undefined }
}

export async function archiveBrand(
  id: string,
  archive: boolean
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('brands')
    .update({ archived_at: archive ? new Date().toISOString() : null })
    .eq('id', id)
    .select('id')

  if (error) {
    console.error('[archiveBrand]', error)
    return { success: false, error: error.message }
  }
  if (!data || data.length === 0) {
    return { success: false, error: 'Brand not found or not editable' }
  }

  revalidatePath('/brands')
  revalidatePath(`/brands/${id}`)
  return { success: true, data: undefined }
}

export async function promoteBrandToDirectory(
  id: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('brands')
    .update({ source: 'manual' })
    .eq('id', id)
    .eq('source', 'outreach')

  if (error) return { success: false, error: error.message }

  revalidatePath('/brands')
  revalidatePath(`/brands/${id}`)
  revalidatePath('/outbound')
  return { success: true, data: undefined }
}

export async function setBrandStage(
  id: string,
  stage: BrandStage
): Promise<ActionResult> {
  const parsed = brandStageSchema.safeParse({ stage })
  if (!parsed.success) {
    return { success: false, error: 'Invalid stage' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('brands')
    .update({ stage: parsed.data.stage })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/brands')
  revalidatePath(`/brands/${id}`)
  revalidatePath('/outbound')
  return { success: true, data: undefined }
}

export { BRAND_STAGES }
export type { BrandStage }
