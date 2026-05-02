import { describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/portal/auth', () => ({ getCreatorForCurrentUser: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import {
  markReceived,
  declineAfterReceipt,
  markStillTrying,
} from '@/app/portal/creator/_actions'
import { getCreatorForCurrentUser } from '@/lib/portal/auth'
import { createClient } from '@/lib/supabase/server'

function mockUpdateChain() {
  // returns { update, lastUpdateArgs, eqStageCalls }
  const eqFinal = vi.fn().mockResolvedValue({ error: null })
  const inFinal = vi.fn().mockResolvedValue({ error: null })
  const eqCreator = vi.fn().mockReturnValue({ eq: eqFinal, in: inFinal })
  const eqId = vi.fn().mockReturnValue({ eq: eqCreator })
  const update = vi.fn().mockReturnValue({ eq: eqId })
  return { update, eqId, eqCreator, eqFinal, inFinal }
}

describe('markReceived', () => {
  it('rejects when not signed in', async () => {
    ;(getCreatorForCurrentUser as any).mockResolvedValue(null)
    const r = await markReceived('m1')
    expect(r.ok).toBe(false)
  })

  it('updates stage to received with stage=accepted guard', async () => {
    ;(getCreatorForCurrentUser as any).mockResolvedValue({ id: 'c1' })
    const chain = mockUpdateChain()
    ;(createClient as any).mockResolvedValue({
      from: vi.fn().mockReturnValue({ update: chain.update }),
    })
    const r = await markReceived('m1')
    expect(r.ok).toBe(true)
    expect(chain.update).toHaveBeenCalledWith({
      stage: 'received',
      received_at: expect.any(String),
    })
    expect(chain.eqFinal).toHaveBeenCalledWith('stage', 'accepted')
  })
})

describe('declineAfterReceipt', () => {
  it('updates stage with stage IN (accepted, received) guard', async () => {
    ;(getCreatorForCurrentUser as any).mockResolvedValue({ id: 'c1' })
    const chain = mockUpdateChain()
    ;(createClient as any).mockResolvedValue({
      from: vi.fn().mockReturnValue({ update: chain.update }),
    })
    const r = await declineAfterReceipt({
      matchId: '00000000-0000-0000-0000-000000000001',
      reasons: ['not aligned'],
      note: '',
    })
    expect(r.ok).toBe(true)
    expect(chain.inFinal).toHaveBeenCalledWith('stage', ['accepted', 'received'])
  })
})

describe('markStillTrying', () => {
  it('updates stage to still_trying with stage=received guard', async () => {
    ;(getCreatorForCurrentUser as any).mockResolvedValue({ id: 'c1' })
    const chain = mockUpdateChain()
    ;(createClient as any).mockResolvedValue({
      from: vi.fn().mockReturnValue({ update: chain.update }),
    })
    const r = await markStillTrying('m1')
    expect(r.ok).toBe(true)
    expect(chain.update).toHaveBeenCalledWith({ stage: 'still_trying' })
    expect(chain.eqFinal).toHaveBeenCalledWith('stage', 'received')
  })
})
