'use server'

import { Resend } from 'resend'

import { brandFormSchema, type BrandFormValues } from '@/lib/schemas/brand'
import { supabaseAdmin } from '@/lib/supabase/admin'

type SubmitResult =
  | { success: true; id: string }
  | { success: false; error: string }

const NOTIFICATION_FROM = 'giftly <armaan@trygiftly.com>'
const NOTIFICATION_TO = [
  'armaan@trygiftly.com',
  'samarjit@trygiftly.com',
  'ethan@trygiftly.com',
]

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function submitBrandForm(
  data: BrandFormValues
): Promise<SubmitResult> {
  const parsed = brandFormSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Invalid form data. Please check your inputs.',
    }
  }

  const v = parsed.data

  const insertPayload = {
    contact_name: v.contactName,
    contact_role: v.contactRole ?? null,
    contact_email: v.contactEmail,
    brand_name: v.brandName,
    website: v.website,
    category: v.category ?? null,
    product_description: v.productDescription,
  }

  const { data: upserted, error: upsertError } = await supabaseAdmin
    .from('brands')
    .upsert(insertPayload, { onConflict: 'website' })
    .select('id, created_at, updated_at')
    .single()

  if (upsertError || !upserted) {
    console.error('[submit-brand] upsert failed', upsertError)
    return {
      success: false,
      error: 'Something went wrong. Please try again.',
    }
  }

  const wasNew = upserted.created_at === upserted.updated_at

  try {
    const key = process.env.RESEND_API_KEY
    if (!key) {
      console.warn('[submit-brand] RESEND_API_KEY not set, skipping email')
    } else {
      const resend = new Resend(key)
      const internalUrl = process.env.INTERNAL_APP_URL
      const recordLink = internalUrl
        ? `${internalUrl.replace(/\/$/, '')}/app/inbound/brand/${upserted.id}`
        : null

      await resend.emails.send({
        from: NOTIFICATION_FROM,
        to: NOTIFICATION_TO,
        subject: `${wasNew ? 'New' : 'Updated'} brand application: ${v.brandName}`,
        html: renderBrandEmail({
          values: v,
          id: upserted.id,
          wasNew,
          recordLink,
        }),
      })
    }
  } catch (err) {
    console.error('[submit-brand] email send failed', err)
  }

  return { success: true, id: upserted.id }
}

function renderBrandEmail({
  values: v,
  id,
  wasNew,
  recordLink,
}: {
  values: BrandFormValues
  id: string
  wasNew: boolean
  recordLink: string | null
}): string {
  const row = (label: string, value: string | null | undefined) => {
    const safe = value && value.length > 0 ? escapeHtml(value) : '—'
    return `<tr><td style="padding:10px 8px;font-weight:600;vertical-align:top;border-bottom:1px solid #eee;width:160px">${label}</td><td style="padding:10px 8px;border-bottom:1px solid #eee;white-space:pre-line">${safe}</td></tr>`
  }

  const websiteHtml = `<a href="https://${escapeHtml(v.website)}">${escapeHtml(v.website)}</a>`

  return `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#111">
      <h2 style="margin:0 0 8px">${wasNew ? 'New' : 'Updated'} brand application</h2>
      <p style="margin:0 0 16px;color:#555;font-size:14px">id: ${escapeHtml(id)}</p>
      <table style="border-collapse:collapse;width:100%;max-width:640px">
        ${row('Brand', v.brandName)}
        <tr><td style="padding:10px 8px;font-weight:600;vertical-align:top;width:160px;border-bottom:1px solid #eee">Website</td><td style="padding:10px 8px;border-bottom:1px solid #eee">${websiteHtml}</td></tr>
        ${row('Category', v.category)}
        ${row('Contact', v.contactName)}
        ${row('Role', v.contactRole)}
        ${row('Email', v.contactEmail)}
        ${row('Product description', v.productDescription)}
      </table>
      ${recordLink ? `<p style="margin:20px 0 0"><a href="${escapeHtml(recordLink)}">open in internal platform →</a></p>` : ''}
    </div>
  `
}
