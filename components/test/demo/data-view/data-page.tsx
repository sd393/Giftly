'use client'

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'

import { MATCH_ROWS } from '../lib/mock-data'
import type { DataViewMode } from '../lib/types'
import { usePersistedState } from '../lib/use-persisted-state'

import { ProductSummaryView } from './product-summary-view'
import { RowsView } from './rows-view'

export default function DataPage() {
  const [mode, setMode] = usePersistedState<DataViewMode>(
    'data:view-mode',
    'rows'
  )

  return (
    <div className="min-h-screen bg-cream text-ink">
      <main className="max-w-[1280px] mx-auto px-6 md:px-10 py-10 pb-24">
        <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-warm font-medium">
              data
            </p>
            <h1 className="mt-1 font-display text-[1.85rem] md:text-[2.25rem] tracking-tight leading-[1.05]">
              Match outcomes —{' '}
              <span className="font-display italic font-light text-coral">
                Lumina Pro
              </span>
            </h1>
            <p className="mt-1.5 text-[0.85rem] text-muted-warm">
              {MATCH_ROWS.length} matches over the last 17 days · post rate
              81%
            </p>
          </div>

          <Tabs
            value={mode}
            onValueChange={(v) => setMode(v as DataViewMode)}
          >
            <TabsList className="bg-cream-warm/70 border border-line/60">
              <TabsTrigger value="rows">Match-level rows</TabsTrigger>
              <TabsTrigger value="product-summary">
                Product summary
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </header>

        <Tabs value={mode} onValueChange={(v) => setMode(v as DataViewMode)}>
          <TabsContent value="rows" className="mt-2">
            <RowsView />
          </TabsContent>
          <TabsContent value="product-summary" className="mt-2">
            <ProductSummaryView />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
