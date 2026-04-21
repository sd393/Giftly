import { NextResponse, type NextRequest } from 'next/server'

import { jsonError, verifyBearerToken } from '@/lib/api/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyBearerToken(request, 'brands:read')
  if (!auth.ok) return auth.response

  const { id } = await params

  const [brandRes, messagesRes] = await Promise.all([
    supabaseAdmin
      .from('brands')
      .select('*')
      .eq('id', id)
      .maybeSingle(),
    supabaseAdmin
      .from('outbound_messages')
      .select(
        'id, channel, direction, subject, body, sender_account, status, external_id, sent_at, created_by, created_by_id'
      )
      .eq('entity_type', 'brand')
      .eq('entity_id', id)
      .order('sent_at', { ascending: false })
      .limit(200),
  ])

  if (brandRes.error) return jsonError(500, 'query_failed', brandRes.error.message)
  if (!brandRes.data) return jsonError(404, 'not_found')

  return NextResponse.json({
    data: brandRes.data,
    messages: messagesRes.data ?? [],
  })
}
