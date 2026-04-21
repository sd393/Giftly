import { NextResponse, type NextRequest } from 'next/server'

import { jsonError, verifyBearerToken } from '@/lib/api/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyBearerToken(request, 'creators:read')
  if (!auth.ok) return auth.response

  const { id } = await params

  const [creatorRes, messagesRes] = await Promise.all([
    supabaseAdmin
      .from('creators')
      .select('*')
      .eq('id', id)
      .maybeSingle(),
    supabaseAdmin
      .from('outbound_messages')
      .select(
        'id, channel, direction, subject, body, sender_account, status, external_id, sent_at, created_by, created_by_id'
      )
      .eq('entity_type', 'creator')
      .eq('entity_id', id)
      .order('sent_at', { ascending: false })
      .limit(200),
  ])

  if (creatorRes.error) return jsonError(500, 'query_failed', creatorRes.error.message)
  if (!creatorRes.data) return jsonError(404, 'not_found')

  return NextResponse.json({
    data: creatorRes.data,
    messages: messagesRes.data ?? [],
  })
}
