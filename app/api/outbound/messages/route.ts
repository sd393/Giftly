import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { jsonError, verifyBearerToken } from '@/lib/api/auth'
import {
  ENTITY_TYPES,
  MESSAGE_DIRECTIONS,
  MESSAGE_STATUSES,
} from '@/lib/schemas/outbound'
import { supabaseAdmin } from '@/lib/supabase/admin'

const postBodySchema = z.object({
  entity_type: z.enum(ENTITY_TYPES),
  entity_id: z.string().uuid(),
  channel: z.string().trim().min(1).max(60).toLowerCase(),
  direction: z.enum(MESSAGE_DIRECTIONS).default('outbound'),
  subject: z.string().trim().max(250).optional().nullable(),
  body: z.string().trim().min(1).max(20000),
  sender_account: z.string().trim().max(250).optional().nullable(),
  status: z.enum(MESSAGE_STATUSES).default('sent'),
  external_id: z.string().trim().max(250).optional().nullable(),
  sent_at: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
})

const querySchema = z.object({
  entity_type: z.enum(ENTITY_TYPES).optional(),
  entity_id: z.string().uuid().optional(),
  channel: z.string().optional(),
  status: z.enum(MESSAGE_STATUSES).optional(),
  direction: z.enum(MESSAGE_DIRECTIONS).optional(),
  sender_account: z.string().optional(),
  since: z.string().datetime().optional(),
  until: z.string().datetime().optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Math.min(Math.max(parseInt(v, 10) || 50, 1), 500) : 100)),
})

export async function GET(request: NextRequest) {
  const auth = await verifyBearerToken(request, 'outbound:read')
  if (!auth.ok) return auth.response

  const url = new URL(request.url)
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) {
    return jsonError(400, 'invalid_query', parsed.error.errors[0]?.message)
  }
  const q = parsed.data

  let query = supabaseAdmin
    .from('outbound_messages')
    .select(
      'id, entity_type, entity_id, channel, direction, subject, body, sender_account, status, external_id, sent_at, created_by, created_by_id, metadata, created_at'
    )

  if (q.entity_type) query = query.eq('entity_type', q.entity_type)
  if (q.entity_id) query = query.eq('entity_id', q.entity_id)
  if (q.channel) query = query.eq('channel', q.channel)
  if (q.status) query = query.eq('status', q.status)
  if (q.direction) query = query.eq('direction', q.direction)
  if (q.sender_account) query = query.eq('sender_account', q.sender_account)
  if (q.since) query = query.gte('sent_at', q.since)
  if (q.until) query = query.lte('sent_at', q.until)

  const { data, error } = await query
    .order('sent_at', { ascending: false })
    .limit(q.limit)

  if (error) return jsonError(500, 'query_failed', error.message)

  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const auth = await verifyBearerToken(request, 'outbound:write')
  if (!auth.ok) return auth.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError(400, 'invalid_json')
  }

  const parsed = postBodySchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(400, 'invalid_body', parsed.error.errors[0]?.message)
  }
  const v = parsed.data

  const { data, error } = await supabaseAdmin
    .from('outbound_messages')
    .insert({
      entity_type: v.entity_type,
      entity_id: v.entity_id,
      channel: v.channel,
      direction: v.direction,
      subject: v.subject ?? null,
      body: v.body,
      sender_account: v.sender_account ?? null,
      status: v.status,
      external_id: v.external_id ?? null,
      sent_at: v.sent_at ?? new Date().toISOString(),
      created_by: 'agent',
      created_by_id: auth.tokenId,
      metadata: (v.metadata ?? {}) as never,
    })
    .select(
      'id, entity_type, entity_id, channel, direction, subject, body, sender_account, status, external_id, sent_at, created_by, created_by_id, metadata, created_at'
    )
    .single()

  if (error || !data) {
    return jsonError(500, 'insert_failed', error?.message)
  }

  return NextResponse.json({ data }, { status: 201 })
}
