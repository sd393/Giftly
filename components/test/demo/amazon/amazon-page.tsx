'use client'

import type { RufusMode } from '../lib/types'
import { usePersistedState } from '../lib/use-persisted-state'

import { AmazonHeader } from './amazon-header'
import { FilterRail } from './filter-rail'
import { ProductGrid } from './product-grid'
import { RufusPanel } from './rufus-panel'

export default function AmazonPage() {
  const [mode, setMode] = usePersistedState<RufusMode>(
    'shopping:rufus-mode',
    'without'
  )

  return (
    // Self-contained Amazon visual scope. The Giftly tokens (cream/coral/font-display)
    // do NOT bleed in here — every color is an arbitrary value or inline hex.
    <div
      data-amazon-scope
      className="min-h-screen bg-white text-[#0F1111]"
      style={{
        fontFamily:
          'Amazon Ember, "Helvetica Neue", Arial, system-ui, sans-serif',
      }}
    >
      <AmazonHeader />

      <div className="mx-auto max-w-[1500px] flex gap-4 px-3 md:px-4 py-4">
        <FilterRail />

        <main className="flex-1 min-w-0">
          <ProductGrid mode={mode} />
        </main>

        <RufusPanel mode={mode} onModeChange={setMode} />
      </div>
    </div>
  )
}
