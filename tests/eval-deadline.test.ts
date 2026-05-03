import { describe, expect, it } from 'vitest'

import {
  EVAL_DEADLINE_DAYS,
  daysLeft,
  evalDeadlineFromReceived,
  isPastDeadline,
} from '@/lib/portal/eval-deadline'

describe('evalDeadlineFromReceived', () => {
  it('adds 7 days to the received timestamp', () => {
    const received = new Date('2026-04-21T12:00:00Z')
    const deadline = evalDeadlineFromReceived(received)
    expect(deadline.toISOString()).toBe('2026-04-28T12:00:00.000Z')
    // Sanity: the 7 lives in exactly one place.
    expect(EVAL_DEADLINE_DAYS).toBe(7)
  })

  it('accepts an ISO string and returns a Date 7 days later', () => {
    const deadline = evalDeadlineFromReceived('2026-05-01T00:00:00Z')
    expect(deadline.toISOString()).toBe('2026-05-08T00:00:00.000Z')
  })
})

describe('isPastDeadline', () => {
  it('returns false for null/undefined (legacy rows without a deadline)', () => {
    expect(isPastDeadline(null)).toBe(false)
    expect(isPastDeadline(undefined)).toBe(false)
  })

  it('returns true when the deadline is in the past', () => {
    const past = new Date(Date.now() - 60_000).toISOString()
    expect(isPastDeadline(past)).toBe(true)
  })

  it('returns false when the deadline is in the future', () => {
    const future = new Date(Date.now() + 60_000).toISOString()
    expect(isPastDeadline(future)).toBe(false)
  })
})

describe('daysLeft', () => {
  it('returns null when there is no deadline', () => {
    expect(daysLeft(null)).toBeNull()
    expect(daysLeft(undefined)).toBeNull()
  })

  it('rounds up partial days remaining', () => {
    // 2.5 days from now should report 3 days left (we round up so the
    // creator never sees "0 days" until truly past midnight on the
    // deadline).
    const future = new Date(Date.now() + 2.5 * 24 * 60 * 60 * 1000)
    expect(daysLeft(future)).toBe(3)
  })

  it('clamps to 0 once past the deadline rather than going negative', () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000)
    expect(daysLeft(past)).toBe(0)
  })
})
