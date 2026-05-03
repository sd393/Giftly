// Eval submission deadline helpers. The 7-day window starts when the
// creator marks a match `received`; both `submitEval` (server-side) and the
// active-gift card UI (client-side countdown) read from this module so the
// constant lives in exactly one place.
//
// Spec: docs/superpowers/specs/2026-05-02-anti-fraud.md (Phase 7h)

export const EVAL_DEADLINE_DAYS = 7

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function evalDeadlineFromReceived(receivedAt: Date | string): Date {
  const base =
    typeof receivedAt === 'string' ? new Date(receivedAt) : receivedAt
  return new Date(base.getTime() + EVAL_DEADLINE_DAYS * MS_PER_DAY)
}

// Null-tolerant: rows that predate the migration won't have a deadline set,
// so we treat null as "no deadline" (in-window indefinitely until an admin
// resets the row). Cron auto-expire is the long-term fix.
export function isPastDeadline(
  deadlineAt: Date | string | null | undefined,
): boolean {
  if (!deadlineAt) return false
  const d = typeof deadlineAt === 'string' ? new Date(deadlineAt) : deadlineAt
  return Date.now() > d.getTime()
}

// Returns calendar-day count remaining (0 == "expires today"); null if no
// deadline is set on the row.
export function daysLeft(
  deadlineAt: Date | string | null | undefined,
): number | null {
  if (!deadlineAt) return null
  const d = typeof deadlineAt === 'string' ? new Date(deadlineAt) : deadlineAt
  const ms = d.getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / MS_PER_DAY))
}
