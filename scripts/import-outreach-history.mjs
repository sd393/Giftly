#!/usr/bin/env node
/**
 * One-shot backfill: read outreach-log.csv and replay every send into
 * outbound_messages / brands, then layer on the Gmail replies surfaced in
 * the inbox search for "Stanford Student Inquiry".
 *
 * Idempotent: before inserting, deletes any existing messages whose
 * metadata.import_source === 'throne_backfill'. Brands are upserted on
 * website (conflict target) and merged with new inbound data.
 *
 * Run: node scripts/import-outreach-history.mjs
 *
 * Env (from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')

loadDotenvLocal()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY
if (!SUPABASE_URL || !SECRET_KEY) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const CSV_PATH = resolve(REPO_ROOT, 'outreach/outreach-log.csv')
const SENDER_ACCOUNT = 'armaanp4423@gmail.com'
const SUBJECT = 'Stanford Student Inquiry'
const BODY_TMPL = `Hi,

We're Stanford/Dartmouth students connecting DTC brands with vetted creators. We match you with creators who actually drive sales, and you only pay commission on results, no contracts.

Would you be interested in 2-3 creator profiles that'd be a great fit for {brand}?

Thanks,
Armaan`

/**
 * Hand-classified Gmail threads surfaced by searching the inbox for
 * subject:"Stanford Student Inquiry" on 2026-04-21. Kind:
 *   - real    : a human engaged (marks outbound replied + logs inbound)
 *   - auto    : autoresponder / ticket bot (logs inbound tagged auto_responder)
 *   - bounced : DSN (updates outbound status to bounced, skips inbound row)
 */
const GMAIL_THREADS = [
  {
    recipient: 'info@prettyplaythings.com',
    kind: 'real',
    sender: 'info@prettyplaythings.com',
    sentAt: '2026-04-21T14:45:44Z',
    subject: 'Re: Stanford Student Inquiry',
    body:
      'Hi, Yes, I would be interested in reviewing creator profiles. Regards, Willie — Willie Barker, Owner, info@prettyplaythings.com',
    externalId: '19db0811ff866f61',
  },
  {
    recipient: 'customercare@lespecs.com',
    kind: 'auto',
    sender: 'customercare@lespecs.com',
    sentAt: '2026-04-21T05:45:15Z',
    subject: '[Le Specs] Re: Stanford Student Inquiry',
    body:
      'Your request (75522) has been updated. Heather (Le Specs). Apr 21, 2026. Hello! Thank you…',
    externalId: '19dae9252181a8a9',
  },
  {
    recipient: 'consumercare@reef.com',
    kind: 'real',
    sender: 'consumercare@reef.com',
    sentAt: '2026-04-20T16:31:01Z',
    subject: 'Re: Stanford Student Inquiry',
    body:
      "Hi Armaan, Thanks for hitting us up at Reef! Due to the nature of your inquiry, we are unable to help you in this matter. Please forward your inquiry to pr@reef.com.",
    externalId: '19dabbb33d91e8a9',
  },
  {
    recipient: 'info@thelumicharge.com',
    kind: 'real',
    sender: 'balajir@rapidconnusa.com',
    sentAt: '2026-04-20T02:12:19Z',
    subject: 'Re: Stanford Student Inquiry',
    body:
      'Sure... what platform will it be for Tiktok? Regards, Balaji Raghunathan, VP-Operations, Rapid Conn. (Armaan followed up with more details the next day.)',
    externalId: '19da8a907195743e',
  },
  {
    recipient: 'hello@emojibator.com',
    kind: 'auto',
    sender: 'hello@emojibator.com',
    sentAt: '2026-04-20T00:20:54Z',
    subject: 'Stanford Student Inquiry',
    body:
      "Thanks for getting in touch with us! This is an automated message to let you know we've received your email and will reply within 1-2 business days.",
    externalId: '19da842fa20d7995',
  },
  {
    recipient: 'hello@setactive.co',
    kind: 'auto',
    sender: 'hello@setactive.co',
    sentAt: '2026-04-20T00:20:03Z',
    subject: 'Stanford Student Inquiry',
    body:
      'Thank you so much for reaching out to SET Active. Your request has been received and one of our customer service associates will get back to you as soon as possible.',
    externalId: '19da8423c90c4f79',
  },
  {
    recipient: 'hello@chelseapeers.com',
    kind: 'auto',
    sender: 'hello@chelseapeers.com',
    sentAt: '2026-04-20T00:19:42Z',
    subject: 'Automatic reply: Stanford Student Inquiry',
    body:
      'Thank you for contacting Chelsea Peers. This is an automatic response to let you know we have received your message.',
    externalId: '19da841f7157b253',
  },
  {
    recipient: 'support@cabeau.com',
    kind: 'auto',
    sender: 'support@cabeau.com',
    sentAt: '2026-04-20T00:19:09Z',
    subject: 'Re: Stanford Student Inquiry',
    body:
      'Hi Customer, Thank you for contacting Customer Service! We have received your email, please allow one business day for us to review your information.',
    externalId: '19da8415f371b56d',
  },
  {
    recipient: 'hello@roughlinen.com',
    kind: 'auto',
    sender: 'hello@roughlinen.com',
    sentAt: '2026-04-20T00:18:20Z',
    subject: 'Re: Stanford Student Inquiry',
    body:
      'Thank you for contacting Rough Linen. We have received your message and are currently in the process of reviewing the details you provided.',
    externalId: '19da8409fb28c7e6',
  },
  {
    recipient: 'press@rains.com',
    kind: 'auto',
    sender: 'press@rains.com',
    sentAt: '2026-04-19T21:20:42Z',
    subject: 'Automatic reply: Stanford Student Inquiry',
    body:
      'Thank you for getting in touch. Your mail is important to us and will be read by a member of Rains Marketing.',
    externalId: '19da79e022b263a4',
  },
  {
    recipient: 'customerservice@spearmintlove.com',
    kind: 'auto',
    sender: 'support@spearmintlove.reamaze.com',
    sentAt: '2026-04-19T21:18:51Z',
    subject: 'Re: Stanford Student Inquiry',
    body:
      'Thank you for reaching out! Our customer service team responds to messages within 1-3 business days.',
    externalId: '19da79c672da69ff',
  },
  {
    recipient: 'support@ryderwear.com',
    kind: 'bounced',
    sender: 'postmaster@ryderwear.com.au',
    sentAt: '2026-04-19T21:08:49Z',
    subject: 'Undeliverable: Stanford Student Inquiry',
    body: "Your email couldn't be forwarded from support@ryderwear.com — receiving server reported an error.",
    externalId: '19da7932731af97c',
  },
  {
    recipient: 'support@tramontina.zendesk.com',
    kind: 'auto',
    sender: 'support@tramontina.zendesk.com',
    sentAt: '2026-04-19T21:17:35Z',
    subject: '504677 - Stanford Student Inquiry',
    body:
      'Thank you for contacting Tramontina. Your ticket is 504677. We will get back to you in the order it was received.',
    externalId: '19da79b245675d23',
  },
  {
    recipient: 'care@clubllondon.com',
    kind: 'auto',
    sender: 'care@clubllondon.com',
    sentAt: '2026-04-19T21:16:39Z',
    subject: 'Re: Stanford Student Inquiry',
    body:
      "Please know that we've received your query and we are finding the best Customer Care representative to help you. Response time is around 1-2 business days.",
    externalId: '19da79a4ca5e3944',
  },
  {
    recipient: 'theskipjack@southerntide.com',
    kind: 'auto',
    sender: 'theskipjack@southerntide.com',
    sentAt: '2026-04-19T21:14:35Z',
    subject: 'Stanford Student Inquiry',
    body:
      "Thanks for reaching out to Southern Tide! We're so happy to hear from you! We have received your message and will get back to you during normal operating hours.",
    externalId: '19da79867935e7f5',
  },
  {
    recipient: 'customercare@astrthelabel.com',
    kind: 'auto',
    sender: 'customercare@astrthelabel.com',
    sentAt: '2026-04-19T21:13:25Z',
    subject: 'Re: Stanford Student Inquiry',
    body:
      'Thank you for contacting us. Unfortunately, we are currently closed. Business hours are Monday through Friday, 8 AM to 4:30 PM PST.',
    externalId: '19da7975599f08b0',
  },
  {
    recipient: 'support@solarisjapan.com',
    kind: 'auto',
    sender: 'support@solarisjapan.com',
    sentAt: '2026-04-19T21:13:00Z',
    subject: 'Re: Stanford Student Inquiry',
    body:
      "Thank you for contacting us! We've received your message and aim to get back to you within 72 hours (excluding weekends).",
    externalId: '19da796f42714cdd',
  },
  {
    recipient: 'hello@brushonblock.com',
    kind: 'bounced',
    sender: 'postmaster@wetsel.net',
    sentAt: '2026-04-19T21:12:30Z',
    subject: 'Undeliverable: Stanford Student Inquiry',
    body: "Your message to hello@brushonblock.com couldn't be delivered. hello wasn't found at brushonblock.com.",
    externalId: '19da79685ee8b752',
  },
  {
    recipient: 'customerservice@veronicabeard.com',
    kind: 'auto',
    sender: 'customerservice@veronicabeard.com',
    sentAt: '2026-04-19T21:11:21Z',
    subject: 'Re: [EXTERNAL] Stanford Student Inquiry',
    body:
      'Thank you for contacting Veronica Beard! This message is to inform you that we have received your email and will respond within 1 business day.',
    externalId: '19da795719f8fd6c',
  },
  {
    recipient: 'sales@bimebeauty.com',
    kind: 'real',
    sender: 'sales@bimebeauty.com',
    sentAt: '2026-04-19T21:15:26Z',
    subject: 'Re: Stanford Student Inquiry',
    body:
      'Hello Armaan, Please send more details. We are always looking for new talent. Tanya',
    externalId: '19da799547749f62',
  },
  {
    recipient: 'customer.service@condorcycles.com',
    kind: 'auto',
    sender: 'customer.service@condorcycles.com',
    sentAt: '2026-04-19T21:09:37Z',
    subject: 'Re: Stanford Student Inquiry',
    body:
      "Thank you for getting in touch! This is an automatic reply to let you know that we've received your message and we'll get back to you as quickly as possible.",
    externalId: '19da79470d95af7c',
  },
  {
    recipient: 'care@womanizer.com',
    kind: 'auto',
    sender: 'care@womanizer.com',
    sentAt: '2026-04-19T21:08:32Z',
    subject: 'Womanizer Case # 00425622: Stanford Student Inquiry',
    body:
      'Thank you for contacting Womanizer Customer Care. Your request for assistance has been received. Case # 00425622 has been created for you.',
    externalId: '19da792dce091f22',
  },
  {
    recipient: 'info@heraclothing.com',
    kind: 'auto',
    sender: 'info@heraclothing.com',
    sentAt: '2026-04-19T21:04:56Z',
    subject: 'Stanford Student Inquiry',
    body:
      'Thanks so much for reaching out to us! Your message has been received into our inbox outside of business hours. Our office hours are Monday-Friday 09:00-17:00.',
    externalId: '19da78f932b8f504',
  },
]

function loadDotenvLocal() {
  const path = resolve(REPO_ROOT, '.env.local')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const k = trimmed.slice(0, eq).trim()
    let v = trimmed.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (!(k in process.env)) process.env[k] = v
  }
}

function parseCsv(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.length > 0)
  const header = lines[0].split(',')
  const rows = []
  for (const line of lines.slice(1)) {
    const cells = line.split(',')
    const row = {}
    header.forEach((h, i) => (row[h] = cells[i] ?? ''))
    rows.push(row)
  }
  return rows
}

function normalizeBrand(raw) {
  let b = raw.trim().replace(/^[Bb]y\s+/, '')
  return b
    .split(/\s+/)
    .map((t) => {
      const letters = [...t].filter((c) => /[a-zA-Z]/.test(c))
      if (letters.length > 1 && letters.every((c) => c === c.toUpperCase())) {
        return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
      }
      return t
    })
    .join(' ')
}

function toSentAtIso(dateStr) {
  // CSV has only YYYY-MM-DD. Park at noon UTC so it sorts chronologically.
  return `${dateStr}T12:00:00Z`
}

async function pickApiTokenId() {
  const { data, error } = await supabase
    .from('api_tokens')
    .select('id')
    .is('revoked_at', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error || !data) {
    throw new Error(
      `Could not find an active api_token row to stamp created_by_id. ${error?.message ?? ''}`
    )
  }
  return data.id
}

async function main() {
  const tokenId = await pickApiTokenId()
  const csvRows = parseCsv(readFileSync(CSV_PATH, 'utf8')).filter(
    (r) => r.brand && r.email && r.domain
  )
  console.log(`csv rows: ${csvRows.length}, gmail threads: ${GMAIL_THREADS.length}`)

  // 1. Upsert brands (dedupe by website).
  const brandsByWebsite = new Map()
  for (const r of csvRows) {
    const website = r.domain.trim().toLowerCase()
    if (!brandsByWebsite.has(website)) {
      brandsByWebsite.set(website, {
        brand_name: normalizeBrand(r.brand),
        website,
        contact_name: '',
        contact_email: r.email.trim().toLowerCase(),
        contact_role: null,
        category: null,
        product_description: null,
      })
    }
  }

  const brandPayload = [...brandsByWebsite.values()]
  const { data: upserted, error: upsertErr } = await supabase
    .from('brands')
    .upsert(brandPayload, { onConflict: 'website' })
    .select('id, website')
  if (upsertErr) throw new Error(`brands upsert: ${upsertErr.message}`)
  const idByWebsite = new Map(upserted.map((b) => [b.website, b.id]))
  console.log(`brands upserted: ${upserted.length}`)

  // 2. Wipe any prior backfill rows so reruns stay deterministic.
  const { error: delErr } = await supabase
    .from('outbound_messages')
    .delete()
    .contains('metadata', { import_source: 'throne_backfill' })
  if (delErr) throw new Error(`delete prior backfill: ${delErr.message}`)

  // 3. Build outbound messages from CSV.
  const outboundPayload = []
  for (let i = 0; i < csvRows.length; i++) {
    const r = csvRows[i]
    const website = r.domain.trim().toLowerCase()
    const entityId = idByWebsite.get(website)
    if (!entityId) continue
    const brandName = normalizeBrand(r.brand)
    outboundPayload.push({
      entity_type: 'brand',
      entity_id: entityId,
      channel: 'email',
      direction: 'outbound',
      subject: SUBJECT,
      body: BODY_TMPL.replace('{brand}', brandName),
      sender_account: SENDER_ACCOUNT,
      status: r.verified === 'BOUNCED' ? 'bounced' : 'sent',
      external_id: null,
      sent_at: toSentAtIso(r.date_sent),
      created_by: 'agent',
      created_by_id: tokenId,
      metadata: {
        import_source: 'throne_backfill',
        contact_email: r.email.trim().toLowerCase(),
        csv_row: i,
      },
    })
  }

  // Insert in batches to stay under PostgREST row limits.
  const chunk = 100
  let inserted = 0
  for (let i = 0; i < outboundPayload.length; i += chunk) {
    const slice = outboundPayload.slice(i, i + chunk)
    const { data, error } = await supabase
      .from('outbound_messages')
      .insert(slice)
      .select('id, entity_id, metadata')
    if (error) throw new Error(`outbound insert @${i}: ${error.message}`)
    inserted += data.length
  }
  console.log(`outbound messages inserted: ${inserted}`)

  // 4. Walk the Gmail threads and layer on inbound rows.
  let inboundInserted = 0
  let realReplies = 0
  let bouncePatched = 0
  for (const t of GMAIL_THREADS) {
    const recipient = t.recipient.toLowerCase()
    // Find matching CSV row by email → brand id.
    const csvRow = csvRows.find((r) => r.email.trim().toLowerCase() === recipient)
    if (!csvRow) {
      console.warn(`  gmail thread: no csv match for ${recipient}`)
      continue
    }
    const entityId = idByWebsite.get(csvRow.domain.trim().toLowerCase())
    if (!entityId) continue

    if (t.kind === 'bounced') {
      const { error } = await supabase
        .from('outbound_messages')
        .update({ status: 'bounced' })
        .eq('entity_id', entityId)
        .eq('status', 'sent')
        .contains('metadata', { import_source: 'throne_backfill' })
      if (error) {
        console.error(`  bounce patch ${recipient}: ${error.message}`)
      } else {
        bouncePatched++
      }
      continue
    }

    const { error } = await supabase.from('outbound_messages').insert({
      entity_type: 'brand',
      entity_id: entityId,
      channel: 'email',
      direction: 'inbound',
      subject: t.subject,
      body: t.body,
      sender_account: t.sender,
      status: 'delivered',
      external_id: t.externalId,
      sent_at: t.sentAt,
      created_by: 'agent',
      created_by_id: tokenId,
      metadata: {
        import_source: 'throne_backfill',
        contact_email: recipient,
        auto_responder: t.kind === 'auto',
      },
    })
    if (error) {
      console.error(`  inbound ${recipient}: ${error.message}`)
      continue
    }
    inboundInserted++

    if (t.kind === 'real') {
      // Mark the outbound as replied + promote the brand to in_talks.
      const { error: upErr } = await supabase
        .from('outbound_messages')
        .update({ status: 'replied' })
        .eq('entity_id', entityId)
        .eq('direction', 'outbound')
        .contains('metadata', { import_source: 'throne_backfill' })
      if (upErr) {
        console.error(`  patch outbound ${recipient}: ${upErr.message}`)
        continue
      }
      const { error: stageErr } = await supabase
        .from('brands')
        .update({ stage: 'in_talks' })
        .eq('id', entityId)
        .eq('stage', 'cold')
      if (stageErr) {
        console.error(`  promote ${recipient}: ${stageErr.message}`)
        continue
      }
      realReplies++
    }
  }

  console.log(
    `inbound inserted: ${inboundInserted} (real replies: ${realReplies}), bounces patched: ${bouncePatched}`
  )
  console.log('done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
