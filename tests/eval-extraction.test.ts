import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { extractEval } from '@/lib/eval-extraction'
import { ExtractedEvalSchema } from '@/lib/schemas/eval'
import { createClient } from '@/lib/supabase/server'

type EvalRow = {
  id: string
  match_id: string
  blob_key: string
  transcript: string | null
  extraction_status: string
}

/**
 * Build a Supabase mock that:
 *   - returns a single `eval_videos` row when selected,
 *   - returns a single joined `matches` row (with product + brand) when
 *     extractEval reads the product context,
 *   - records every `update()` call against eval_videos and matches,
 *   - serves a pretend blob from storage.download.
 *
 * The mock keeps an in-memory copy of the row that updates are applied to
 * so the test can assert the final shape.
 */
function makeSupabaseMock(opts: {
  evalRow?: EvalRow | null
  selectError?: { message: string } | null
  downloadError?: { message: string } | null
  blob?: Blob | null
  productName?: string
  brandName?: string
} = {}) {
  const initialRow: EvalRow = opts.evalRow ?? {
    id: 'eval-1',
    match_id: 'match-1',
    blob_key: 'match-1/abc.mp4',
    transcript: null,
    extraction_status: 'pending',
  }
  const row: Record<string, unknown> = { ...initialRow }
  const evalUpdates: Record<string, unknown>[] = []
  const matchUpdates: Record<string, unknown>[] = []

  // eval_videos.select(...).eq.order.limit.single
  const evalSingle = vi
    .fn()
    .mockResolvedValue({
      data: opts.selectError ? null : initialRow,
      error: opts.selectError ?? null,
    })
  const evalLimit = vi.fn().mockReturnValue({ single: evalSingle })
  const evalOrder = vi.fn().mockReturnValue({ limit: evalLimit })
  const evalEqSelect = vi.fn().mockReturnValue({ order: evalOrder })
  const evalSelect = vi.fn().mockReturnValue({ eq: evalEqSelect })

  // matches.select(...).eq.single (product/brand context join)
  const matchSingle = vi.fn().mockResolvedValue({
    data: {
      id: 'match-1',
      product: {
        name: opts.productName ?? 'Test Shoe',
        brand: { brand_name: opts.brandName ?? 'Acme' },
      },
    },
    error: null,
  })
  const matchEqSelect = vi.fn().mockReturnValue({ single: matchSingle })
  const matchSelect = vi.fn().mockReturnValue({ eq: matchEqSelect })

  // eval_videos.update(payload).eq('id', row.id)
  const evalUpdateEq = vi.fn().mockResolvedValue({ error: null })
  const evalUpdate = vi.fn().mockImplementation((payload: Record<string, unknown>) => {
    evalUpdates.push({ ...payload })
    Object.assign(row, payload)
    return { eq: evalUpdateEq }
  })

  // matches.update(payload).eq('id', match_id)
  const matchUpdateEq = vi.fn().mockResolvedValue({ error: null })
  const matchUpdate = vi
    .fn()
    .mockImplementation((payload: Record<string, unknown>) => {
      matchUpdates.push({ ...payload })
      return { eq: matchUpdateEq }
    })

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === 'eval_videos') return { select: evalSelect, update: evalUpdate }
    if (table === 'matches') return { select: matchSelect, update: matchUpdate }
    return {}
  })

  // storage.from('eval-videos').download(blob_key)
  const blob = opts.blob ?? new Blob([new Uint8Array(8)], { type: 'video/mp4' })
  const download = vi
    .fn()
    .mockResolvedValue({
      data: opts.downloadError ? null : blob,
      error: opts.downloadError ?? null,
    })
  const storageFrom = vi.fn().mockReturnValue({ download })

  return {
    from,
    storage: { from: storageFrom },
    _calls: {
      select: evalSelect,
      matchSelect,
      evalUpdate,
      evalUpdateEq,
      matchUpdate,
      matchUpdateEq,
      download,
      storageFrom,
    },
    _state: { row, evalUpdates, matchUpdates },
  }
}

const goodPayload = {
  transcript: 'I would absolutely keep using this. Slipping it on now.',
  visual_observations: [
    'creator slips the shoe on barefoot',
    'packaging shown briefly at the start',
  ],
  demonstrated_use_cases: ['walking around the apartment'],
  would_keep_using: 'yes',
  worth_the_price: 'maybe_at_discount',
  best_for: ['runners'],
  not_for: [],
  one_line_take: 'solid daily wear.',
  sentiment: 'positive',
  raw_quotes: ['I would absolutely keep using this.'],
  product_visible_in_video: true,
  product_match_confidence: 'high',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('extractEval', () => {
  it('returns error when no eval row exists', async () => {
    const supa = makeSupabaseMock({
      selectError: { message: 'no rows' },
    })
    ;(createClient as any).mockResolvedValue(supa)
    const r = await extractEval('match-1', { extract: vi.fn() })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/eval row not found/i)
    // No status writes happened
    expect(supa._calls.evalUpdate).not.toHaveBeenCalled()
  })

  it('aborts when extraction_status is already running', async () => {
    const supa = makeSupabaseMock({
      evalRow: {
        id: 'eval-1',
        match_id: 'match-1',
        blob_key: 'k.mp4',
        transcript: null,
        extraction_status: 'running',
      },
    })
    ;(createClient as any).mockResolvedValue(supa)
    const extract = vi.fn()
    const r = await extractEval('match-1', { extract })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/already running/i)
    expect(extract).not.toHaveBeenCalled()
    expect(supa._calls.evalUpdate).not.toHaveBeenCalled()
  })

  it('happy path: extracts video, mirrors transcript, flips match to eval_complete', async () => {
    const supa = makeSupabaseMock({
      productName: 'Cloud Runner',
      brandName: 'Acme Footwear',
    })
    ;(createClient as any).mockResolvedValue(supa)
    const extract = vi.fn().mockResolvedValue(goodPayload)

    const r = await extractEval('match-1', { extract })

    expect(r.ok).toBe(true)
    // Provider was called with the downloaded blob AND the product context.
    expect(extract).toHaveBeenCalledTimes(1)
    expect(extract.mock.calls[0][0]).toBeInstanceOf(Blob)
    expect(extract.mock.calls[0][1]).toEqual({
      productName: 'Cloud Runner',
      brandName: 'Acme Footwear',
    })
    expect(supa._calls.storageFrom).toHaveBeenCalledWith('eval-videos')
    expect(supa._calls.download).toHaveBeenCalledWith('match-1/abc.mp4')

    // running marker comes before complete marker.
    const evalUpdates = supa._state.evalUpdates
    const runningIdx = evalUpdates.findIndex(
      (u) => u.extraction_status === 'running',
    )
    const completeIdx = evalUpdates.findIndex(
      (u) => u.extraction_status === 'complete',
    )
    expect(runningIdx).toBeGreaterThanOrEqual(0)
    expect(completeIdx).toBeGreaterThan(runningIdx)

    // running update flags both transcript_status and extraction_status,
    // since the OpenAI provider produces both atomically (Whisper +
    // GPT-4o vision run inside the single `extract` call).
    expect(evalUpdates[runningIdx].transcript_status).toBe('running')

    // Final complete payload contains parsed data, mirrored transcript,
    // and extracted_at — and clears the transcript_status too.
    const finalEvalUpdate = evalUpdates[completeIdx]
    expect(finalEvalUpdate.extracted).toEqual(goodPayload)
    expect(finalEvalUpdate.extracted_at).toEqual(expect.any(String))
    expect(finalEvalUpdate.extraction_error).toBeNull()
    expect(finalEvalUpdate.transcript).toBe(goodPayload.transcript)
    expect(finalEvalUpdate.transcript_status).toBe('complete')
    expect(finalEvalUpdate.transcript_error).toBeNull()

    // The new video-native fields are present in the saved jsonb.
    const extracted = finalEvalUpdate.extracted as typeof goodPayload
    expect(extracted.transcript).toBe(goodPayload.transcript)
    expect(extracted.visual_observations).toEqual(
      goodPayload.visual_observations,
    )
    expect(extracted.demonstrated_use_cases).toEqual(
      goodPayload.demonstrated_use_cases,
    )
    // And the new anti-fraud fields round-trip too.
    expect(extracted.product_visible_in_video).toBe(true)
    expect(extracted.product_match_confidence).toBe('high')

    // Match flip happened with eval_complete + timestamp.
    expect(supa._state.matchUpdates).toHaveLength(1)
    expect(supa._state.matchUpdates[0]).toEqual({
      stage: 'eval_complete',
      eval_complete_at: expect.any(String),
    })
    expect(supa._calls.matchUpdateEq).toHaveBeenCalledWith('id', 'match-1')
  })

  it('provider failure: extraction_status=failed, transcript_status=failed, match never flipped', async () => {
    const supa = makeSupabaseMock()
    ;(createClient as any).mockResolvedValue(supa)
    const extract = vi.fn().mockRejectedValue(new Error('openai boom'))

    const r = await extractEval('match-1', { extract })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/openai boom/)
    // matches table never updated
    expect(supa._state.matchUpdates).toHaveLength(0)

    // last eval_videos update must mark BOTH statuses failed (single
    // call produces both, so they fail together).
    const last =
      supa._state.evalUpdates[supa._state.evalUpdates.length - 1]
    expect(last.extraction_status).toBe('failed')
    expect(last.extraction_error).toMatch(/openai boom/)
    expect(last.transcript_status).toBe('failed')
    expect(last.transcript_error).toMatch(/openai boom/)
  })

  it('provider returning invalid JSON shape: extraction_status=failed, error populated', async () => {
    const supa = makeSupabaseMock()
    ;(createClient as any).mockResolvedValue(supa)
    // Missing required keys → schema parse fails
    const extract = vi.fn().mockResolvedValue({ wat: 'nope' })

    const r = await extractEval('match-1', { extract })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/did not match schema/i)

    // Match still untouched
    expect(supa._state.matchUpdates).toHaveLength(0)

    // last eval update must be extraction_status=failed
    const last =
      supa._state.evalUpdates[supa._state.evalUpdates.length - 1]
    expect(last.extraction_status).toBe('failed')
    expect(last.extraction_error).toMatch(/did not match schema/i)
    // transcript_status also marked failed — they fail together now.
    expect(last.transcript_status).toBe('failed')
  })

  it('re-running a complete eval overwrites cleanly (idempotency)', async () => {
    const supa = makeSupabaseMock({
      evalRow: {
        id: 'eval-1',
        match_id: 'match-1',
        blob_key: 'k.mp4',
        transcript: 'old transcript',
        extraction_status: 'complete',
      },
    })
    ;(createClient as any).mockResolvedValue(supa)
    const extract = vi.fn().mockResolvedValue(goodPayload)

    const r = await extractEval('match-1', { extract })

    expect(r.ok).toBe(true)
    expect(extract).toHaveBeenCalledTimes(1)

    // Final extraction update overwrites with the new parsed payload.
    const last =
      supa._state.evalUpdates[supa._state.evalUpdates.length - 1]
    expect(last.extraction_status).toBe('complete')
    expect(last.extracted).toEqual(goodPayload)
    // And mirrors the new transcript onto the legacy column.
    expect(last.transcript).toBe(goodPayload.transcript)

    // Match was flipped (or kept) at eval_complete.
    expect(supa._state.matchUpdates).toHaveLength(1)
    expect(supa._state.matchUpdates[0]).toEqual({
      stage: 'eval_complete',
      eval_complete_at: expect.any(String),
    })
  })
})

describe('ExtractedEvalSchema (anti-fraud fields)', () => {
  it('parses valid product_visible_in_video + product_match_confidence', async () => {
    const valid = ExtractedEvalSchema.safeParse(goodPayload)
    expect(valid.success).toBe(true)
    if (valid.success) {
      expect(valid.data.product_visible_in_video).toBe(true)
      expect(valid.data.product_match_confidence).toBe('high')
    }
  })

  it('accepts null for both anti-fraud fields (model could not tell)', async () => {
    const r = ExtractedEvalSchema.safeParse({
      ...goodPayload,
      product_visible_in_video: null,
      product_match_confidence: null,
    })
    expect(r.success).toBe(true)
  })

  it('rejects an out-of-enum confidence value', async () => {
    const r = ExtractedEvalSchema.safeParse({
      ...goodPayload,
      product_match_confidence: 'super-high',
    })
    expect(r.success).toBe(false)
  })

  it('rejects a non-boolean product_visible_in_video', async () => {
    const r = ExtractedEvalSchema.safeParse({
      ...goodPayload,
      product_visible_in_video: 'yes',
    })
    expect(r.success).toBe(false)
  })
})
