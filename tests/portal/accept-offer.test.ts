import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/portal/auth', () => ({ getCreatorForCurrentUser: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { acceptOffer } from '@/app/portal/creator/_actions'
import { getCreatorForCurrentUser } from '@/lib/portal/auth'
import { createClient } from '@/lib/supabase/server'

describe('acceptOffer', () => {
  it('rejects if creator not signed in', async () => {
    ;(getCreatorForCurrentUser as any).mockResolvedValue(null)
    const r = await acceptOffer('m1')
    expect(r.ok).toBe(false)
  })

  it('happy path: updates stage to accepted', async () => {
    ;(getCreatorForCurrentUser as any).mockResolvedValue({ id: 'c1' })
    const eqStage = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })
    const updateMock = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: eqStage }) })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn().mockReturnValue({ update: updateMock }),
    })
    const r = await acceptOffer('m1')
    expect(r.ok).toBe(true)
    expect(updateMock).toHaveBeenCalledWith({
      stage: 'accepted',
      accepted_at: expect.any(String),
    })
  })
})
