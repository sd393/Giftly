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
import { readFileSync, existsSync, readdirSync } from 'node:fs'
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
const CACHE_DIR = resolve(REPO_ROOT, 'outreach/.gmail-cache')
const DEFAULT_SENDER = 'armaanp4423@gmail.com'
const SUBJECT = 'Stanford Student Inquiry'
const BODY_TMPL = `Hi,

We're Stanford/Dartmouth students connecting DTC brands with vetted creators. We match you with creators who actually drive sales, and you only pay commission on results, no contracts.

Would you be interested in 2-3 creator profiles that'd be a great fit for {brand}?

Thanks,
Armaan`

/**
 * Load every *-threads.json cache file in outreach/.gmail-cache/ and
 * normalize to { recipient, kind, sender, sentAt, subject, body, externalId }.
 *
 * Kind values the importer understands:
 *   - real    : a human engaged (marks outbound replied + logs inbound)
 *   - auto    : autoresponder / ticket bot (logs inbound tagged auto_responder)
 *   - bounced : DSN (updates outbound status to bounced, skips inbound row)
 *
 * Cache files are produced by scripts/collect-gmail-replies.py.
 */
function loadGmailThreads() {
  if (!existsSync(CACHE_DIR)) return []
  const entries = []
  const seen = new Set()
  for (const file of readdirSync(CACHE_DIR)) {
    if (!file.endsWith('-threads.json')) continue
    const path = resolve(CACHE_DIR, file)
    let parsed
    try {
      parsed = JSON.parse(readFileSync(path, 'utf8'))
    } catch (err) {
      console.warn(`skipping ${file}: ${err.message}`)
      continue
    }
    if (!Array.isArray(parsed)) continue
    for (const raw of parsed) {
      const gmailId = raw.gmail_id ?? raw.externalId
      if (!gmailId || seen.has(gmailId)) continue
      seen.add(gmailId)
      entries.push({
        recipient: (raw.recipient || '').toLowerCase(),
        kind: raw.kind,
        sender: raw.sender || raw.sender_display || '',
        sentAt: raw.internal_date_ms
          ? new Date(Number(raw.internal_date_ms)).toISOString()
          : raw.sentAt || new Date().toISOString(),
        subject: raw.subject || 'Stanford Student Inquiry',
        body: (raw.body || '').slice(0, 4000),
        externalId: gmailId,
      })
    }
  }
  return entries
}

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
  const gmailThreads = loadGmailThreads()
  console.log(`csv rows: ${csvRows.length}, gmail threads: ${gmailThreads.length}`)

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
      sender_account: DEFAULT_SENDER,
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
  for (const t of gmailThreads) {
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
