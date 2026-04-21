import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { jsonError, verifyBearerToken } from '@/lib/api/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

const querySchema = z.object({
  q: z.string().optional(),
  platform: z.string().optional(),
  niche: z.string().optional(),
  email: z.string().optional(),
  show: z.enum(['active', 'archived', 'all']).optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Math.min(Math.max(parseInt(v, 10) || 50, 1), 500) : 100)),
})

export async function GET(request: NextRequest) {
  const auth = await verifyBearerToken(request, 'creators:read')
  if (!auth.ok) return auth.response

  const url = new URL(request.url)
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) {
    return jsonError(400, 'invalid_query', parsed.error.errors[0]?.message)
  }
  const q = parsed.data

  let query = supabaseAdmin
    .from('creators')
    .select(
      'id, name, email, social_handles, platform, followers, niches, product_interests, content_link, notes, owner_id, reviewed_at, archived_at, created_at, updated_at'
    )

  const show = q.show ?? 'active'
  if (show === 'active') query = query.is('archived_at', null)
  else if (show === 'archived') query = query.not('archived_at', 'is', null)

  if (q.platform) query = query.ilike('platform', q.platform)
  if (q.niche) query = query.contains('niches', [q.niche])
  if (q.email) query = query.eq('email', q.email.toLowerCase())

  if (q.q) {
    const esc = q.q.replace(/[%_]/g, (m) => `\\${m}`)
    const like = `%${esc}%`
    query = query.or(
      `name.ilike.${like},email.ilike.${like},social_handles.ilike.${like},product_interests.ilike.${like}`
    )
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(q.limit)

  if (error) return jsonError(500, 'query_failed', error.message)

  return NextResponse.json({ data })
}
