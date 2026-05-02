import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    auth: { admin: { inviteUserByEmail: vi.fn() } },
  },
}))

import { sendPortalInvite } from '@/app/platform/(authed)/creators/[id]/_actions'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

describe('sendPortalInvite', () => {
  it('refuses when creator already has auth_user_id', async () => {
    const fromMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'c1', email: 'a@b.com', auth_user_id: 'already' },
            error: null,
          }),
        }),
      }),
    })
    ;(createClient as any).mockResolvedValue({ from: fromMock })
    const result = await sendPortalInvite('c1')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/already invited/i)
  })

  it('happy path: invites + binds auth_user_id + sets invited_at', async () => {
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })
    const fromMock = vi.fn().mockImplementation((table: string) => {
      if (table === 'creators') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'c2', email: 'new@example.com', auth_user_id: null },
                error: null,
              }),
            }),
          }),
          update: updateMock,
        }
      }
      return {} as any
    })
    const inviteMock = vi.fn().mockResolvedValue({
      data: { user: { id: 'auth-uid-xyz' } },
      error: null,
    })
    ;(createClient as any).mockResolvedValue({ from: fromMock })
    ;(supabaseAdmin as any).auth.admin.inviteUserByEmail = inviteMock

    const result = await sendPortalInvite('c2')
    expect(result.ok).toBe(true)
    // redirectTo must point at the platform-host auth callback so PKCE
    // exchange runs there and the session cookie ends up on the platform
    // host (where the portal lives).
    expect(inviteMock).toHaveBeenCalledWith(
      'new@example.com',
      expect.objectContaining({
        redirectTo: expect.stringMatching(
          /\/auth\/callback\?next=\/portal\/creator$/
        ),
      })
    )
    expect(updateMock).toHaveBeenCalledWith({
      auth_user_id: 'auth-uid-xyz',
      invited_at: expect.any(String),
    })
  })
})
