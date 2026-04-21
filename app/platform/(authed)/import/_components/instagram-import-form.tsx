'use client'

import JSZip from 'jszip'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import {
  importInstagramDMs,
  type DMInput,
  type ImportResult,
} from '../_actions'

const GIFTLY_KEYWORDS = [
  'giftly',
  'trygiftly',
  'creator partnership',
  'creator profile',
  'vetted creator',
  'commission only',
  'no contracts',
  'brand partnership',
  'brand collab',
  'brand collaboration',
]

type MetaMessage = {
  sender_name?: string
  timestamp_ms?: number
  content?: string
  type?: string
}

type MetaThread = {
  participants?: { name?: string }[]
  messages?: MetaMessage[]
}

function fixMetaEncoding(s: string): string {
  // Meta encodes UTF-8 bytes as Latin-1 escapes; round-trip to recover.
  try {
    const bytes = new Uint8Array(s.length)
    for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i) & 0xff
    return new TextDecoder('utf-8').decode(bytes)
  } catch {
    return s
  }
}

function matchesGiftly(text: string): boolean {
  const t = text.toLowerCase()
  return GIFTLY_KEYWORDS.some((k) => t.includes(k))
}

function normalizeTimestamp(ms: number | undefined): string | undefined {
  if (!ms) return undefined
  const date = new Date(ms)
  return date.toISOString().replace(/\.\d+Z$/, 'Z')
}

async function parseIgZip(
  file: File,
  selfName: string,
  senderAccount: string,
  sourceTag: string,
  applyKeywordFilter: boolean
): Promise<{ dms: DMInput[]; threadsScanned: number }> {
  const zip = await JSZip.loadAsync(file)
  // Support both the newer (your_instagram_activity/messages/inbox/) and
  // older (messages/inbox/) layouts.
  const messageFileRe =
    /(?:your_instagram_activity\/)?messages\/inbox\/([^/]+)\/message_\d+\.json$/
  const fileNames = Object.keys(zip.files).filter((n) => messageFileRe.test(n))
  const dms: DMInput[] = []
  const threads = new Set<string>()

  for (const fname of fileNames) {
    const m = fname.match(messageFileRe)
    if (!m) continue
    const threadFolder = m[1]
    threads.add(threadFolder)

    let data: MetaThread
    try {
      const text = await zip.files[fname].async('string')
      data = JSON.parse(text) as MetaThread
    } catch {
      continue
    }

    for (const msg of data.messages ?? []) {
      if (msg.sender_name !== selfName) continue
      const type = msg.type ?? ''
      if (type && type !== 'Generic' && type !== 'Text') continue
      let content = msg.content
      if (!content) continue
      content = fixMetaEncoding(content)
      if (applyKeywordFilter && !matchesGiftly(content)) continue

      // Derive recipient from participants, skipping self.
      const recipient =
        (data.participants ?? [])
          .map((p) => (p.name ? fixMetaEncoding(p.name) : null))
          .filter((n): n is string => !!n && n !== selfName)
          .join(', ') || '(unknown)'

      dms.push({
        recipient: recipient.slice(0, 160),
        thread_folder: threadFolder.slice(0, 200),
        body: content.slice(0, 20000),
        ig_message_id: `${threadFolder}-${msg.timestamp_ms ?? 0}`.slice(0, 250),
        sent_at: normalizeTimestamp(msg.timestamp_ms),
        sender_account: senderAccount,
        source_tag: sourceTag,
      })
    }
  }

  return { dms, threadsScanned: threads.size }
}

type Status =
  | { stage: 'idle' }
  | { stage: 'parsing'; message: string }
  | { stage: 'preview'; dms: DMInput[]; threadsScanned: number }
  | { stage: 'uploading' }
  | { stage: 'done'; result: ImportResult }
  | { stage: 'error'; message: string }

export function InstagramImportForm() {
  const [file, setFile] = useState<File | null>(null)
  const [selfName, setSelfName] = useState('Giftly')
  const [senderAccount, setSenderAccount] = useState('@trygiftly')
  const [sourceTag, setSourceTag] = useState('giftly')
  const [keywordFilter, setKeywordFilter] = useState(false)
  const [status, setStatus] = useState<Status>({ stage: 'idle' })

  async function handleParse() {
    if (!file) {
      toast.error('Pick a Meta export ZIP first')
      return
    }
    setStatus({ stage: 'parsing', message: `Reading ${file.name}…` })
    try {
      const { dms, threadsScanned } = await parseIgZip(
        file,
        selfName,
        senderAccount,
        sourceTag,
        keywordFilter
      )
      setStatus({ stage: 'preview', dms, threadsScanned })
    } catch (err) {
      setStatus({
        stage: 'error',
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }

  async function handleUpload() {
    if (status.stage !== 'preview') return
    setStatus({ stage: 'uploading' })
    const res = await importInstagramDMs({ dms: status.dms })
    if (res.success) {
      setStatus({ stage: 'done', result: res.data })
      toast.success(
        `Uploaded ${res.data.ok} new (${res.data.skipped_dup} already in platform)`
      )
    } else {
      setStatus({ stage: 'error', message: res.error })
      toast.error(`Upload failed: ${res.error}`)
    }
  }

  function reset() {
    setFile(null)
    setStatus({ stage: 'idle' })
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-4 rounded border border-line/60 p-4">
        <div className="space-y-2">
          <Label htmlFor="ig-zip">Meta export ZIP</Label>
          <Input
            id="ig-zip"
            type="file"
            accept=".zip,application/zip"
            disabled={status.stage === 'parsing' || status.stage === 'uploading'}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null)
              setStatus({ stage: 'idle' })
            }}
          />
          <p className="text-xs text-muted-warm">
            Download from IG app → Settings → Accounts Center → Your information
            and permissions → Download your information → Messages, JSON format.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="self-name">Your display name in the export</Label>
            <Input
              id="self-name"
              value={selfName}
              onChange={(e) => setSelfName(e.target.value)}
              placeholder="e.g. Giftly"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sender-account">Sender account label</Label>
            <Input
              id="sender-account"
              value={senderAccount}
              onChange={(e) => setSenderAccount(e.target.value)}
              placeholder="e.g. @trygiftly"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="source-tag">Source tag (metadata)</Label>
            <Input
              id="source-tag"
              value={sourceTag}
              onChange={(e) => setSourceTag(e.target.value)}
              placeholder="e.g. giftly"
            />
          </div>
          <div className="flex items-start gap-2 pt-6">
            <input
              id="kw-filter"
              type="checkbox"
              checked={keywordFilter}
              onChange={(e) => setKeywordFilter(e.target.checked)}
              className="mt-1"
            />
            <div className="space-y-1">
              <Label htmlFor="kw-filter">Apply Giftly keyword filter</Label>
              <p className="text-xs text-muted-warm">
                Check for personal accounts. Leave off for the Giftly brand
                account (whole account is outreach).
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleParse}
            disabled={
              !file || status.stage === 'parsing' || status.stage === 'uploading'
            }
          >
            {status.stage === 'parsing' ? 'Parsing…' : 'Parse ZIP'}
          </Button>
          {status.stage !== 'idle' ? (
            <Button variant="outline" onClick={reset}>
              Reset
            </Button>
          ) : null}
        </div>
      </div>

      {status.stage === 'parsing' ? (
        <p className="text-sm text-muted-warm">{status.message}</p>
      ) : null}

      {status.stage === 'error' ? (
        <div className="rounded border border-coral-deep/40 bg-coral-deep/5 p-4 text-sm text-coral-deep">
          {status.message}
        </div>
      ) : null}

      {status.stage === 'preview' ? (
        <div className="space-y-4 rounded border border-line/60 p-4">
          <div>
            <p className="text-sm font-medium">Preview</p>
            <p className="text-xs text-muted-warm">
              {status.threadsScanned} threads scanned · {status.dms.length}{' '}
              outbound DMs ready to upload
            </p>
          </div>

          {status.dms.length === 0 ? (
            <p className="text-sm text-muted-warm">
              Nothing to upload — no outbound DMs matched your filters.
            </p>
          ) : (
            <>
              <div className="max-h-60 overflow-auto rounded border border-line/40 bg-cream-dim/30 text-xs">
                <table className="w-full">
                  <thead className="bg-cream-dim/60">
                    <tr className="text-left">
                      <th className="px-3 py-2 font-medium">Sent</th>
                      <th className="px-3 py-2 font-medium">Recipient</th>
                      <th className="px-3 py-2 font-medium">Body</th>
                    </tr>
                  </thead>
                  <tbody>
                    {status.dms.slice(0, 20).map((dm, i) => (
                      <tr key={i} className="border-t border-line/30">
                        <td className="px-3 py-1.5 whitespace-nowrap text-muted-warm">
                          {dm.sent_at?.slice(0, 10) ?? '—'}
                        </td>
                        <td className="px-3 py-1.5 whitespace-nowrap">
                          {dm.recipient}
                        </td>
                        <td className="px-3 py-1.5 max-w-lg truncate">
                          {dm.body}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {status.dms.length > 20 ? (
                <p className="text-xs text-muted-warm">
                  Showing first 20 of {status.dms.length}.
                </p>
              ) : null}

              <Button onClick={handleUpload}>
                Upload {status.dms.length} DMs to platform
              </Button>
            </>
          )}
        </div>
      ) : null}

      {status.stage === 'uploading' ? (
        <p className="text-sm text-muted-warm">Uploading…</p>
      ) : null}

      {status.stage === 'done' ? (
        <div className="rounded border border-emerald-400/40 bg-emerald-50 p-4 text-sm">
          <p className="font-medium">Done.</p>
          <ul className="mt-2 space-y-1">
            <li>Logged: {status.result.ok}</li>
            <li>Skipped (already in platform): {status.result.skipped_dup}</li>
            <li>Failed: {status.result.failed}</li>
          </ul>
          {status.result.errors.length > 0 ? (
            <details className="mt-3">
              <summary className="cursor-pointer">
                {status.result.errors.length} error(s)
              </summary>
              <ul className="mt-2 list-disc pl-5 space-y-1 text-xs">
                {status.result.errors.slice(0, 20).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
