import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { jsonError, verifyBearerToken } from '@/lib/api/auth'
import { normalizeRootDomain } from '@/lib/schemas/brand'
import { supabaseAdmin } from '@/lib/supabase/admin'

const bodySchema = z.object({
  brand_name: z.string().trim().min(1).max(160),
  website: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .transform((v, ctx) => {
      const root = normalizeRootDomain(v)
      if (!root || !root.includes('.')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid website',
        })
        return z.NEVER
      }
      return root
    }),
  contact_name: z.string().trim().max(120).optional(),
  contact_email: z.string().trim().toLowerCase().email().max(320).optional(),
  contact_role: z.string().trim().max(120).optional(),
  category: z.string().trim().max(120).optional(),
  product_description: z.string().trim().max(2000).optional(),
})

/**
 * Look up an existing brand by normalized root domain, or create a stub if
 * none exists. Used by the outreach pipeline to resolve a brand ID before
 * logging outbound messages.
 */
export async function POST(request: NextRequest) {
  const auth = await verifyBearerToken(request, 'brands:write')
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

  const { data: existing, error: lookupError } = await supabaseAdmin
    .from('brands')
    .select('id, brand_name, website, created_at, updated_at, archived_at')
    .eq('website', v.website)
    .maybeSingle()

  if (lookupError) return jsonError(500, 'lookup_failed', lookupError.message)

  if (existing) {
    return NextResponse.json({
      data: existing,
      created: false,
    })
  }

  const { data, error } = await supabaseAdmin
    .from('brands')
    .insert({
      brand_name: v.brand_name,
      website: v.website,
      // Pipeline-discovered brands don't have a real human contact until they
      // reply. Stash the scraped email/name/role so a team member can verify.
      contact_name: v.contact_name ?? '',
      contact_email: v.contact_email ?? '',
      contact_role: v.contact_role ?? null,
      category: v.category ?? null,
      product_description: v.product_description ?? null,
      source: 'outreach',
    })
    .select('id, brand_name, website, created_at, updated_at, archived_at')
    .single()

  if (error || !data) {
    return jsonError(500, 'insert_failed', error?.message)
  }

  return NextResponse.json({ data, created: true }, { status: 201 })
}
