import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/portal/auth', () => ({ getCreatorForCurrentUser: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { submitEval } from '@/app/portal/creator/_actions'
import { getCreatorForCurrentUser } from '@/lib/portal/auth'
import { createClient } from '@/lib/supabase/server'

function makeFile({
  bytes = 1024,
  type = 'video/mp4',
  name = 'eval.mp4',
}: {
  bytes?: number
  type?: string
  name?: string
} = {}): File {
  // Build a minimal Blob-backed File with the desired byte size.
  const blob = new Blob([new Uint8Array(bytes)], { type })
  return new File([blob], name, { type })
}

// Default sentiment is 'positive' so existing tests continue to exercise the
// happy path. Tests that need a different value or to omit the field set it
// explicitly.
function makeFormData(opts: {
  matchId?: string | null
  file?: File | null
  sentiment?: string | null
} = {}) {
  const fd = new FormData()
  if (opts.matchId !== null && opts.matchId !== undefined) {
    fd.set('matchId', opts.matchId)
  }
  if (opts.file) fd.set('file', opts.file)
  // Treat `null` as "explicitly omit"; treat `undefined` as "use default".
  if (opts.sentiment === undefined) {
    fd.set('creator_stated_sentiment', 'positive')
  } else if (opts.sentiment !== null) {
    fd.set('creator_stated_sentiment', opts.sentiment)
  }
  return fd
}

/** Build a Supabase client mock with a chainable matches.select / update,
 *  storage.upload, and eval_videos.insert. The match row returned from
 *  .single() defaults to stage='received' and creator_id matching the test
 *  creator id; override via the `match` arg. */
function makeSupabaseMock(opts: {
  match?: { id: string; stage: string; creator_id: string } | null
  matchSelectError?: { message: string } | null
  uploadError?: { message: string } | null
  insertError?: { message: string } | null
  updateError?: { message: string } | null
} = {}) {
  const match = opts.match ?? {
    id: 'match-1',
    stage: 'received',
    creator_id: 'creator-1',
  }

  const single = vi
    .fn()
    .mockResolvedValue({ data: match, error: opts.matchSelectError ?? null })
  const eqCreator = vi.fn().mockReturnValue({ single })
  const eqId = vi.fn().mockReturnValue({ eq: eqCreator })
  const select = vi.fn().mockReturnValue({ eq: eqId })

  // matches.update(...).eq(id).eq(creator_id).in(stage, [...])
  const updateInStage = vi
    .fn()
    .mockResolvedValue({ error: opts.updateError ?? null })
  const updateEqCreator = vi
    .fn()
    .mockReturnValue({ in: updateInStage })
  const updateEqId = vi.fn().mockReturnValue({ eq: updateEqCreator })
  const update = vi.fn().mockReturnValue({ eq: updateEqId })

  // eval_videos.insert(...)
  const insert = vi
    .fn()
    .mockResolvedValue({ error: opts.insertError ?? null })

  const upload = vi
    .fn()
    .mockResolvedValue({ error: opts.uploadError ?? null })
  const storageFrom = vi.fn().mockReturnValue({ upload })

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === 'matches') return { select, update }
    if (table === 'eval_videos') return { insert }
    return {}
  })

  return {
    from,
    storage: { from: storageFrom },
    // expose internals for assertions
    _calls: { select, update, insert, upload, storageFrom, from },
  }
}

describe('submitEval', () => {
  it('rejects when no file', async () => {
    ;(getCreatorForCurrentUser as any).mockResolvedValue({ id: 'creator-1' })
    const r = await submitEval(makeFormData({ matchId: 'match-1' }))
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/video/i)
  })

  it('rejects oversized file', async () => {
    ;(getCreatorForCurrentUser as any).mockResolvedValue({ id: 'creator-1' })
    const big = makeFile({ bytes: 500 * 1024 * 1024 + 1 })
    const r = await submitEval(makeFormData({ matchId: 'match-1', file: big }))
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/500 MB/)
  })

  it('rejects unsupported mime type', async () => {
    ;(getCreatorForCurrentUser as any).mockResolvedValue({ id: 'creator-1' })
    const wrong = makeFile({ type: 'image/png', name: 'pic.png' })
    const r = await submitEval(
      makeFormData({ matchId: 'match-1', file: wrong }),
    )
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/unsupported/i)
  })

  it('rejects when creator_stated_sentiment is missing', async () => {
    ;(getCreatorForCurrentUser as any).mockResolvedValue({ id: 'creator-1' })
    const r = await submitEval(
      makeFormData({
        matchId: 'match-1',
        file: makeFile(),
        sentiment: null,
      }),
    )
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/positive or negative/i)
  })

  it('rejects when creator_stated_sentiment is invalid value', async () => {
    ;(getCreatorForCurrentUser as any).mockResolvedValue({ id: 'creator-1' })
    const r = await submitEval(
      makeFormData({
        matchId: 'match-1',
        file: makeFile(),
        sentiment: 'mixed',
      }),
    )
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/positive or negative/i)
  })

  it('rejects when match.stage is not received', async () => {
    ;(getCreatorForCurrentUser as any).mockResolvedValue({ id: 'creator-1' })
    const supa = makeSupabaseMock({
      match: { id: 'match-1', stage: 'accepted', creator_id: 'creator-1' },
    })
    ;(createClient as any).mockResolvedValue(supa)
    const r = await submitEval(
      makeFormData({ matchId: 'match-1', file: makeFile() }),
    )
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/isn['’]t open/i)
    // never reached storage / insert
    expect(supa._calls.upload).not.toHaveBeenCalled()
    expect(supa._calls.insert).not.toHaveBeenCalled()
  })

  it('rejects when not signed in', async () => {
    ;(getCreatorForCurrentUser as any).mockResolvedValue(null)
    const r = await submitEval(
      makeFormData({ matchId: 'match-1', file: makeFile() }),
    )
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/signed in/i)
  })

  it('happy path: uploads, inserts (with stated sentiment), updates stage', async () => {
    ;(getCreatorForCurrentUser as any).mockResolvedValue({ id: 'creator-1' })
    const supa = makeSupabaseMock()
    ;(createClient as any).mockResolvedValue(supa)

    const file = makeFile({ bytes: 2048, type: 'video/mp4' })
    const r = await submitEval(
      makeFormData({ matchId: 'match-1', file, sentiment: 'positive' }),
    )

    expect(r.ok).toBe(true)
    // upload happened to the eval-videos bucket with a key prefixed by match id
    expect(supa._calls.storageFrom).toHaveBeenCalledWith('eval-videos')
    const [blobKey, fileArg, opts] = supa._calls.upload.mock.calls[0]
    expect(blobKey).toMatch(/^match-1\/.+\.mp4$/)
    expect(fileArg).toBe(file)
    expect(opts).toEqual({ contentType: 'video/mp4' })
    // eval_videos row inserted with correct shape, including stated sentiment
    expect(supa._calls.insert).toHaveBeenCalledWith({
      match_id: 'match-1',
      blob_key: blobKey,
      bytes: 2048,
      mime_type: 'video/mp4',
      creator_stated_sentiment: 'positive',
    })
    // stage update fired
    expect(supa._calls.update).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'eval_submitted',
        eval_submitted_at: expect.any(String),
      }),
    )
  })

  it('happy path: persists negative sentiment', async () => {
    ;(getCreatorForCurrentUser as any).mockResolvedValue({ id: 'creator-1' })
    const supa = makeSupabaseMock()
    ;(createClient as any).mockResolvedValue(supa)
    const file = makeFile()
    const r = await submitEval(
      makeFormData({ matchId: 'match-1', file, sentiment: 'negative' }),
    )
    expect(r.ok).toBe(true)
    expect(supa._calls.insert).toHaveBeenCalledWith(
      expect.objectContaining({ creator_stated_sentiment: 'negative' }),
    )
  })

  it('uses .mov extension for video/quicktime', async () => {
    ;(getCreatorForCurrentUser as any).mockResolvedValue({ id: 'creator-1' })
    const supa = makeSupabaseMock()
    ;(createClient as any).mockResolvedValue(supa)
    const file = makeFile({ type: 'video/quicktime', name: 'eval.mov' })
    const r = await submitEval(makeFormData({ matchId: 'match-1', file }))
    expect(r.ok).toBe(true)
    const [blobKey] = supa._calls.upload.mock.calls[0]
    expect(blobKey).toMatch(/^match-1\/.+\.mov$/)
  })

  it('surfaces storage upload errors', async () => {
    ;(getCreatorForCurrentUser as any).mockResolvedValue({ id: 'creator-1' })
    const supa = makeSupabaseMock({
      uploadError: { message: 'bucket boom' },
    })
    ;(createClient as any).mockResolvedValue(supa)
    const r = await submitEval(
      makeFormData({ matchId: 'match-1', file: makeFile() }),
    )
    expect(r.ok).toBe(false)
    expect(r.error).toBe('bucket boom')
    expect(supa._calls.insert).not.toHaveBeenCalled()
  })
})
