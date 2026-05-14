'use client'

import { useMemo } from 'react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { JsonView } from './json-view'
import { buildUcp, UCP_SPEC_VERSION } from './lib/skus'
import type { Sku, UcpView } from './lib/types'

export function UcpInspector({
  sku,
  view,
  onViewChange,
}: {
  sku: Sku
  view: UcpView
  onViewChange: (v: UcpView) => void
}) {
  const doc = useMemo(() => buildUcp(sku, view), [sku, view])
  const isEnriched = view === 'enriched'

  return (
    <article className="bg-white border border-[#e5e1dc] rounded-2xl flex flex-col overflow-hidden">
      <header className="border-b border-[#ece8e1] px-5 py-4 flex flex-wrap items-center justify-between gap-3 bg-[#fafaf7]">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a7566] font-semibold">
            UCP product object · spec {UCP_SPEC_VERSION}
          </p>
          <p className="text-[15px] font-semibold text-[#2a1a12] leading-tight mt-0.5">
            What the agent reads
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[12px] text-[#8a7566]" htmlFor="ucp-view">
            View
          </label>
          <Select
            value={view}
            onValueChange={(v) => onViewChange(v as UcpView)}
          >
            <SelectTrigger
              id="ucp-view"
              className="w-[260px] bg-white border-[#e5e1dc] text-[13px] text-[#2a1a12]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="baseline">
                <span className="font-medium">Baseline UCP</span>
                <span className="text-[#8a7566] ml-1">— stock fields only</span>
              </SelectItem>
              <SelectItem value="enriched">
                <span className="font-medium">UCP + Giftly Signal</span>
                <span className="text-[#8a7566] ml-1">— enrichment attached</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="px-5 py-4 max-h-[640px] overflow-auto bg-white">
        <JsonView
          value={doc}
          highlightKeys={isEnriched ? ['co.giftly.preference_signals'] : []}
        />
      </div>

      <footer className="border-t border-[#ece8e1] px-5 py-3 flex items-center justify-between bg-[#fafaf7]">
        <p className="text-[11.5px] text-[#8a7566]">
          UCP catalog spec {UCP_SPEC_VERSION}
        </p>
        <p className="text-[11.5px] text-[#8a7566] font-mono">
          {Object.keys(doc).length} top-level fields · 1 variant
        </p>
      </footer>
    </article>
  )
}
