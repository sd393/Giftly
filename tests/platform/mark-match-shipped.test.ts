import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

import { markMatchShipped } from '@/lib/match-shipping'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Build a Supabase admin mock that walks the read-then-write the lib does:
 *   1. supabaseAdmin.from('matches').select(...).eq('id', ...).single()
 *   2. supabaseAdmin.from('matches').update(...).eq('id', ...).eq('stage', ...)
 *
 * The mock keeps the last update payload accessible so tests can assert
 * what was written.
 */
function makeMock(opts: {
  loadRow?: { id: string; stage: string } | null
  loadError?: { message: string } | null
  updateError?: { message: string } | null
} = {}) {
  const row = opts.loadRow ?? { id: 'm1', stage: 'accepted' }
  const single = vi.fn().mockResolvedValue({
    data: opts.loadError ? null : row,
    error: opts.loadError ?? null,
  })
  const eqSelect = vi.fn().mockReturnValue({ single })
  const select = vi.fn().mockReturnValue({ eq: eqSelect })

  const eqStage = vi
    .fn()
    .mockResolvedValue({ error: opts.updateError ?? null })
  const eqId = vi.fn().mockReturnValue({ eq: eqStage })
  const updates: Record<string, unknown>[] = []
  const update = vi.fn().mockImplementation((payload: Record<string, unknown>) => {
    updates.push({ ...payload })
    return { eq: eqId }
  })

  const from = vi.fn().mockReturnValue({ select, update })
  return { from, _calls: { select, update, eqStage }, _state: { updates } }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('markMatchShipped', () => {
  it('happy path: stage=accepted → shipped, tracking saved', async () => {
    const supa = makeMock()
    ;(supabaseAdmin as any).from = supa.from

    const r = await markMatchShipped('m1', {
      trackingNumber: '1Z999',
      trackingCarrier: 'UPS',
    })
    expect(r.ok).toBe(true)
    expect(supa._state.updates).toHaveLength(1)
    expect(supa._state.updates[0]).toEqual({
      stage: 'shipped',
      shipped_at: expect.any(String),
      tracking_number: '1Z999',
      tracking_carrier: 'UPS',
    })
    // Stage guard applied at the write layer.
    expect(supa._calls.eqStage).toHaveBeenCalledWith('stage', 'accepted')
  })

  it('rejects when match is not at stage=accepted', async () => {
    const supa = makeMock({ loadRow: { id: 'm1', stage: 'shipped' } })
    ;(supabaseAdmin as any).from = supa.from

    const r = await markMatchShipped('m1', {
      trackingNumber: '1Z999',
      trackingCarrier: 'UPS',
    })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/expected.*accepted/i)
    // No write attempt when guard fails.
    expect(supa._state.updates).toHaveLength(0)
  })

  it('rejects when match not found', async () => {
    const supa = makeMock({ loadError: { message: 'no rows' } })
    ;(supabaseAdmin as any).from = supa.from

    const r = await markMatchShipped('m1')
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/not found/i)
    expect(supa._state.updates).toHaveLength(0)
  })

  it('tracking fields are optional — no opts works', async () => {
    const supa = makeMock()
    ;(supabaseAdmin as any).from = supa.from

    const r = await markMatchShipped('m1')
    expect(r.ok).toBe(true)
    expect(supa._state.updates[0]).toEqual({
      stage: 'shipped',
      shipped_at: expect.any(String),
      tracking_number: null,
      tracking_carrier: null,
    })
  })

  it('coerces empty/whitespace tracking strings to null', async () => {
    const supa = makeMock()
    ;(supabaseAdmin as any).from = supa.from

    const r = await markMatchShipped('m1', {
      trackingNumber: '   ',
      trackingCarrier: '',
    })
    expect(r.ok).toBe(true)
    expect(supa._state.updates[0].tracking_number).toBeNull()
    expect(supa._state.updates[0].tracking_carrier).toBeNull()
  })
})
