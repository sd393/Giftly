'use client'

import { useMemo, useTransition } from 'react'

import {
  IN_PROGRESS_MATCHES,
  SUGGESTED_CREATORS,
} from '../lib/mock-data'
import type { Match } from '../lib/types'
import { usePersistedState } from '../lib/use-persisted-state'

import { InProgressCard } from './in-progress-card'
import { SuggestedCreatorCard } from './suggested-creator-card'

export function MatchesTab() {
  const [approvedIds, setApprovedIds] = usePersistedState<string[]>(
    'brand:approved',
    []
  )
  const [, startTransition] = useTransition()

  const suggested = useMemo(
    () => SUGGESTED_CREATORS.filter((c) => !approvedIds.includes(c.id)),
    [approvedIds]
  )

  const inProgress = useMemo<Match[]>(() => {
    const approvedAsMatches: Match[] = approvedIds
      .map((id) => SUGGESTED_CREATORS.find((c) => c.id === id))
      .filter((c): c is (typeof SUGGESTED_CREATORS)[number] => Boolean(c))
      .map<Match>((c) => ({
        id: `match-${c.id}-approved`,
        creatorId: c.id,
        productId: 'lumina-pro-stress-defense',
        stage: 'approved',
        stageLabel: 'Approved → Pending shipment',
        detail: 'Just approved — fulfillment will pick this up next.',
      }))
    return [
      ...approvedAsMatches,
      ...IN_PROGRESS_MATCHES.filter(
        (m) => !approvedIds.includes(m.creatorId)
      ),
    ]
  }, [approvedIds])

  function approve(id: string) {
    startTransition(() => {
      setApprovedIds((prev) =>
        prev.includes(id) ? prev : [id, ...prev]
      )
    })
  }

  return (
    <div className="space-y-10">
      <section>
        <header className="flex items-baseline gap-3 mb-4">
          <h3 className="font-display text-[1.15rem] tracking-tight">
            Suggested creators
          </h3>
          <span className="text-[0.75rem] text-muted-warm">
            {suggested.length} match{suggested.length === 1 ? '' : 'es'} ·
            ordered by fit
          </span>
        </header>

        {suggested.length === 0 ? (
          <p className="text-[0.85rem] text-muted-warm">
            No remaining suggestions — all approved. Refresh suggestions to
            pull a new pool.
          </p>
        ) : (
          <ul className="space-y-3">
            {suggested.map((c) => (
              <li key={c.id}>
                <SuggestedCreatorCard
                  creator={c}
                  onApprove={approve}
                  pending={false}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <header className="flex items-baseline gap-3 mb-4">
          <h3 className="font-display text-[1.15rem] tracking-tight">
            In progress
          </h3>
          <span className="text-[0.75rem] text-muted-warm">
            {inProgress.length} active
          </span>
        </header>

        {inProgress.length === 0 ? (
          <p className="text-[0.85rem] text-muted-warm">
            No active shipments yet. Approve a suggestion to start one.
          </p>
        ) : (
          <ul className="space-y-3">
            {inProgress.map((m) => {
              const creator = SUGGESTED_CREATORS.find(
                (c) => c.id === m.creatorId
              )
              return (
                <li key={m.id}>
                  <InProgressCard match={m} creator={creator} />
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
