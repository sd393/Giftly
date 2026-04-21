'use server'

import { revalidatePath } from 'next/cache'

import { generateApiToken } from '@/lib/api-tokens'
import { createTokenSchema } from '@/lib/schemas/settings'
import { createClient } from '@/lib/supabase/server'

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function createApiToken(raw: unknown): Promise<
  ActionResult<{ id: string; token: string; label: string; scopes: string[] }>
> {
  const parsed = createTokenSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not signed in' }

  const { token, hash } = generateApiToken()

  const { data, error } = await supabase
    .from('api_tokens')
    .insert({
      label: parsed.data.label,
      scopes: parsed.data.scopes,
      token_hash: hash,
      created_by: user.id,
    })
    .select('id, label, scopes')
    .single()

  if (error || !data) {
    return { success: false, error: error?.message ?? 'Failed to create token' }
  }

  revalidatePath('/settings')
  return {
    success: true,
    data: {
      id: data.id,
      token,
      label: data.label,
      scopes: data.scopes,
    },
  }
}

export async function revokeApiToken(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('api_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .is('revoked_at', null)

  if (error) return { success: false, error: error.message }

  revalidatePath('/settings')
  return { success: true, data: undefined }
}
