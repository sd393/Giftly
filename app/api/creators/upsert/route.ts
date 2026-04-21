import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { jsonError, verifyBearerToken } from '@/lib/api/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

const bodySchema = z.object({
  name: z.string().trim().min(1).max(160),
  // Real email when we have it. Optional to support pipeline-discovered
  // prospects (e.g. Instagram DMs where the handle is all we know).
  email: z.string().trim().toLowerCase().email().max(320).optional(),
  // Stable external identifier used to synthesize an email when none is
  // provided. For IG DMs this is typically the thread folder name.
  external_ref: z.string().trim().min(1).max(160).optional(),
  platform: z.string().trim().max(60).optional(),
  social_handles: z.string().trim().max(500).optional(),
  followers: z.string().trim().max(120).optional(),
  niches: z.array(z.string().trim().max(60)).max(20).optional(),
  product_interests: z.string().trim().max(2000).optional(),
  content_link: z.string().trim().url().max(500).optional(),
  notes: z.string().trim().max(2000).optional(),
})

const SYNTHETIC_EMAIL_DOMAIN = 'prospect.giftly.internal'

/**
 * Look up a creator by email (real or synthesized from external_ref), or
 * create a stub if none exists. Mirrors `POST /api/brands/upsert` so the
 * outreach pipeline can resolve a creator ID before logging outbound DMs.
 *
 * When `email` is missing, the caller must pass `external_ref` and we build
 * a synthetic unique email so the NOT-NULL UNIQUE constraint on
 * `creators.email` is satisfied. Swap to the real email later via the
 * standard creator update flow once they reply.
 */
export async function POST(request: NextRequest) {
  const auth = await verifyBearerToken(request, 'creators:write')
  if (!auth.ok) return auth.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError(400, 'invalid_json')
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(400, 'invalid_body', parsed.error.errors[0]?.message)
  }
  const v = parsed.data

  let email = v.email
  if (!email) {
    if (!v.external_ref) {
      return jsonError(
        400,
        'invalid_body',
        'email or external_ref is required'
      )
    }
    const slug = v.external_ref.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase()
    email = `ig_${slug}@${SYNTHETIC_EMAIL_DOMAIN}`
  }

  const { data: existing, error: lookupError } = await supabaseAdmin
    .from('creators')
    .select('id, name, email, created_at, updated_at, archived_at')
    .eq('email', email)
    .maybeSingle()

  if (lookupError) return jsonError(500, 'lookup_failed', lookupError.message)

  if (existing) {
    return NextResponse.json({
      data: existing,
      created: false,
    })
  }

  const { data, error } = await supabaseAdmin
    .from('creators')
    .insert({
      name: v.name,
      email,
      platform: v.platform ?? null,
      social_handles: v.social_handles ?? null,
      followers: v.followers ?? null,
      niches: v.niches ?? [],
      product_interests: v.product_interests ?? null,
      content_link: v.content_link ?? null,
      notes: v.notes ?? null,
      // Pipeline-discovered creators: keep them out of the /creators
      // directory (which defaults to source='application' form submissions)
      // until they reply / sign up.
      source: 'outreach',
    })
    .select('id, name, email, created_at, updated_at, archived_at')
    .single()

  if (error || !data) {
    return jsonError(500, 'insert_failed', error?.message)
  }

  return NextResponse.json({ data, created: true }, { status: 201 })
}
