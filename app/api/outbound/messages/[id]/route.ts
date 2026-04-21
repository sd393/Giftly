import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { jsonError, verifyBearerToken } from '@/lib/api/auth'
import { MESSAGE_STATUSES } from '@/lib/schemas/outbound'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Database } from '@/lib/supabase/types'

type MessageUpdate = Database['public']['Tables']['outbound_messages']['Update']

const patchBodySchema = z.object({
  status: z.enum(MESSAGE_STATUSES).optional(),
  subject: z.string().trim().max(250).optional().nullable(),
  body: z.string().trim().min(1).max(20000).optional(),
  metadata: z.record(z.unknown()).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyBearerToken(request, 'outbound:write')
  if (!auth.ok) return auth.response

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError(400, 'invalid_json')
  }

  const parsed = patchBodySchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(400, 'invalid_body', parsed.error.errors[0]?.message)
  }

  const update: MessageUpdate = {}
  if (parsed.data.status !== undefined) update.status = parsed.data.status
  if (parsed.data.subject !== undefined) update.subject = parsed.data.subject
  if (parsed.data.body !== undefined) update.body = parsed.data.body
  if (parsed.data.metadata !== undefined)
    update.metadata = parsed.data.metadata as never

  if (Object.keys(update).length === 0) {
    return jsonError(400, 'empty_patch', 'At least one field is required')
  }

  const { data, error } = await supabaseAdmin
    .from('outbound_messages')
    .update(update)
    .eq('id', id)
    .select(
      'id, entity_type, entity_id, channel, direction, subject, body, sender_account, status, external_id, sent_at, created_by, created_by_id, metadata, created_at'
    )
    .maybeSingle()

  if (error) return jsonError(500, 'update_failed', error.message)
  if (!data) return jsonError(404, 'not_found')

  return NextResponse.json({ data })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyBearerToken(request, 'outbound:read')
  if (!auth.ok) return auth.response

  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('outbound_messages')
    .select(
      'id, entity_type, entity_id, channel, direction, subject, body, sender_account, status, external_id, sent_at, created_by, created_by_id, metadata, created_at'
    )
    .eq('id', id)
    .maybeSingle()

  if (error) return jsonError(500, 'query_failed', error.message)
  if (!data) return jsonError(404, 'not_found')

  return NextResponse.json({ data })
}
