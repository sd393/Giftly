'use server'

import { Resend } from 'resend'

import {
  creatorFormSchema,
  type CreatorFormValues,
} from '@/lib/schemas/creator'
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

export async function submitCreatorForm(
  data: CreatorFormValues
): Promise<SubmitResult> {
  const parsed = creatorFormSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Invalid form data. Please check your inputs.',
    }
  }

  const v = parsed.data

  const insertPayload = {
    name: v.name,
    email: v.email,
    social_handles: v.socialHandles ?? null,
    platform: v.platform ?? null,
    followers: v.followers ?? null,
    niches: v.niches,
    product_interests: v.productInterests,
    content_link: v.contentLink ?? null,
    shipping_address: v.shippingAddress ?? null,
    source: 'application' as const,
  }

  const { data: upserted, error: upsertError } = await supabaseAdmin
    .from('creators')
    .upsert(insertPayload, { onConflict: 'email' })
    .select('id, created_at, updated_at')
    .single()

  if (upsertError || !upserted) {
    console.error('[submit-creator] upsert failed', upsertError)
    return {
      success: false,
      error: 'Something went wrong. Please try again.',
    }
  }

  const wasNew = upserted.created_at === upserted.updated_at

  // Notify the team. Email failure must not fail the submission.
  try {
    const key = process.env.RESEND_API_KEY
    if (!key) {
      console.warn('[submit-creator] RESEND_API_KEY not set, skipping email')
    } else {
      const resend = new Resend(key)
      const internalUrl = process.env.INTERNAL_APP_URL
      const recordLink = internalUrl
        ? `${internalUrl.replace(/\/$/, '')}/app/inbound/creator/${upserted.id}`
        : null

      await resend.emails.send({
        from: NOTIFICATION_FROM,
        to: NOTIFICATION_TO,
        subject: `${wasNew ? 'New' : 'Updated'} creator application: ${v.email}`,
        html: renderCreatorEmail({
          values: v,
          id: upserted.id,
          wasNew,
          recordLink,
        }),
      })
    }
  } catch (err) {
    console.error('[submit-creator] email send failed', err)
  }

  return { success: true, id: upserted.id }
}

function renderCreatorEmail({
  values: v,
  id,
  wasNew,
  recordLink,
}: {
  values: CreatorFormValues
  id: string
  wasNew: boolean
  recordLink: string | null
}): string {
  const row = (label: string, value: string | null | undefined) => {
    const safe = value && value.length > 0 ? escapeHtml(value) : '—'
    return `<tr><td style="padding:10px 8px;font-weight:600;vertical-align:top;border-bottom:1px solid #eee;width:160px">${label}</td><td style="padding:10px 8px;border-bottom:1px solid #eee;white-space:pre-line">${safe}</td></tr>`
  }

  const niches = v.niches.map(escapeHtml).join(', ')
  const linkHtml = v.contentLink
    ? `<a href="${escapeHtml(v.contentLink)}">${escapeHtml(v.contentLink)}</a>`
    : '—'

  return `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#111">
      <h2 style="margin:0 0 8px">${wasNew ? 'New' : 'Updated'} creator application</h2>
      <p style="margin:0 0 16px;color:#555;font-size:14px">id: ${escapeHtml(id)}</p>
      <table style="border-collapse:collapse;width:100%;max-width:640px">
        ${row('Name', v.name)}
        ${row('Email', v.email)}
        ${row('Social handles', v.socialHandles)}
        ${row('Primary platform', v.platform)}
        ${row('Followers', v.followers)}
        ${row('Niches', niches)}
        ${row('Product interests', v.productInterests)}
        ${row('Shipping address', v.shippingAddress)}
        <tr><td style="padding:10px 8px;font-weight:600;vertical-align:top;width:160px">Content link</td><td style="padding:10px 8px">${linkHtml}</td></tr>
      </table>
      ${recordLink ? `<p style="margin:20px 0 0"><a href="${escapeHtml(recordLink)}">open in internal platform →</a></p>` : ''}
    </div>
  `
}
