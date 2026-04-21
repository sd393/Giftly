import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { jsonError, verifyBearerToken } from '@/lib/api/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

const querySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  website: z.string().optional(),
  show: z.enum(['active', 'archived', 'all']).optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Math.min(Math.max(parseInt(v, 10) || 50, 1), 500) : 100)),
})

export async function GET(request: NextRequest) {
  const auth = await verifyBearerToken(request, 'brands:read')
  if (!auth.ok) return auth.response

  const url = new URL(request.url)
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) {
    return jsonError(400, 'invalid_query', parsed.error.errors[0]?.message)
  }
  const q = parsed.data

  let query = supabaseAdmin
    .from('brands')
    .select(
      'id, brand_name, website, category, contact_name, contact_role, contact_email, product_description, notes, owner_id, reviewed_at, archived_at, created_at, updated_at'
    )

  const show = q.show ?? 'active'
  if (show === 'active') query = query.is('archived_at', null)
  else if (show === 'archived') query = query.not('archived_at', 'is', null)

  if (q.category) query = query.ilike('category', q.category)
  if (q.website) query = query.eq('website', q.website.toLowerCase())

  if (q.q) {
    const esc = q.q.replace(/[%_]/g, (m) => `\\${m}`)
    const like = `%${esc}%`
    query = query.or(
      `brand_name.ilike.${like},website.ilike.${like},contact_name.ilike.${like},contact_email.ilike.${like},category.ilike.${like}`
    )
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(q.limit)

  if (error) return jsonError(500, 'query_failed', error.message)

  return NextResponse.json({ data })
}
