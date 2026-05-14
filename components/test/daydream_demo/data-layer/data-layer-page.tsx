'use client'

import { useState, useEffect } from 'react'

import { usePersistedState } from '../lib/use-persisted-state'
import type { DataTab } from '../lib/types'
import { CatalogSchemaTab } from './catalog-schema-tab'
import { ProductMatchingTab } from './product-matching-tab'
import { PerProductDetailTab } from './per-product-detail-tab'

const TABS: { id: DataTab; label: string }[] = [
  { id: 'schema', label: 'Catalog Schema' },
  { id: 'matching', label: 'Product Matching' },
  { id: 'detail', label: 'Per-Product Detail' },
]

export function DataLayerPage() {
  const [active, setActive] = usePersistedState<DataTab>(
    'activeDataTab',
    'schema'
  )
  // Avoid SSR/CSR mismatch on the persisted tab — keep render stable until mount.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const current = mounted ? active : 'schema'

  return (
    <div className="flex min-h-[calc(100vh-3rem)] flex-col bg-zinc-50">
      <div className="flex items-center gap-1 border-b border-zinc-200 bg-white px-6 pt-3">
        {TABS.map((tab) => {
          const isActive = current === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              className={
                'relative px-4 py-2.5 text-sm transition-colors ' +
                (isActive
                  ? 'text-zinc-900 font-medium'
                  : 'text-zinc-500 hover:text-zinc-800')
              }
            >
              {tab.label}
              {isActive && (
                <span className="absolute inset-x-3 -bottom-px h-0.5 bg-zinc-900" />
              )}
            </button>
          )
        })}
      </div>
      <div className="flex-1">
        {current === 'schema' && <CatalogSchemaTab />}
        {current === 'matching' && <ProductMatchingTab />}
        {current === 'detail' && <PerProductDetailTab />}
      </div>
    </div>
  )
}
