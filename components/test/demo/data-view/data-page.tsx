'use client'

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'

import {
  EYELASH_CURLER_SCHEMA,
  PER_VIDEO_EXTRACTIONS,
} from '../lib/mock-data'
import type { DataViewMode } from '../lib/types'
import { usePersistedState } from '../lib/use-persisted-state'

import { ExtractionsView } from './extractions-view'
import { MatrixView } from './matrix-view'
import { SchemaView } from './schema-view'

export default function DataPage() {
  const [mode, setMode] = usePersistedState<DataViewMode>(
    'data:view-mode',
    'extractions'
  )

  const topAttrCount = EYELASH_CURLER_SCHEMA.attributes.filter(
    (a) => a.in_top_schema
  ).length

  return (
    <div className="min-h-screen bg-cream text-ink">
      <main className="max-w-[1280px] mx-auto px-6 md:px-10 py-10 pb-24">
        <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-warm font-medium">
              data
            </p>
            <h1 className="mt-1 font-display text-[1.85rem] md:text-[2.25rem] tracking-tight leading-[1.05]">
              Pipeline output —{' '}
              <span className="font-display italic font-light text-coral">
                eyelash curlers
              </span>
            </h1>
            <p className="mt-1.5 text-[0.85rem] text-muted-warm">
              {topAttrCount} induced attributes ·{' '}
              {PER_VIDEO_EXTRACTIONS.length} video extractions · schema{' '}
              {EYELASH_CURLER_SCHEMA.schema_version}
            </p>
          </div>

          <Tabs value={mode} onValueChange={(v) => setMode(v as DataViewMode)}>
            <TabsList className="bg-cream-warm/70 border border-line/60">
              <TabsTrigger value="extractions">Extractions</TabsTrigger>
              <TabsTrigger value="schema">Schema</TabsTrigger>
              <TabsTrigger value="matrix">Matrix</TabsTrigger>
            </TabsList>
          </Tabs>
        </header>

        <Tabs value={mode} onValueChange={(v) => setMode(v as DataViewMode)}>
          <TabsContent value="extractions" className="mt-2">
            <ExtractionsView />
          </TabsContent>
          <TabsContent value="schema" className="mt-2">
            <SchemaView />
          </TabsContent>
          <TabsContent value="matrix" className="mt-2">
            <MatrixView />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
