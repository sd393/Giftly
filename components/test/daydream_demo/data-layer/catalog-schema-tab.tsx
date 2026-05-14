'use client'

import { Fragment } from 'react'

import { usePersistedState } from '../lib/use-persisted-state'
import { PRODUCTS } from '../lib/products'
import type { EnrichedProduct } from '../lib/types'
import { SnowflakeSqlBlock } from './snowflake-sql-block'

const CATALOG_SQL = 'SELECT * FROM products LIMIT 10;'

const JOIN_SQL = `SELECT p.*, g.*
FROM products p
LEFT JOIN giftly_signal g
  ON p.product_match_key = g.product_match_key
LIMIT 10;`

type SqlType = 'TEXT' | 'FLOAT' | 'JSONB' | 'TIMESTAMP'

const CATALOG_COLUMNS: { key: keyof EnrichedProduct; label: string; type: SqlType }[] = [
  { key: 'product_id', label: 'product_id', type: 'TEXT' },
  { key: 'brand', label: 'brand', type: 'TEXT' },
  { key: 'name', label: 'name', type: 'TEXT' },
  { key: 'description', label: 'description', type: 'TEXT' },
  { key: 'price', label: 'price', type: 'FLOAT' },
  { key: 'image_url', label: 'image_url', type: 'TEXT' },
  { key: 'style_tags', label: 'style_tags', type: 'JSONB' },
  { key: 'vector_embedding_id', label: 'vector_embedding_id', type: 'TEXT' },
  { key: 'product_match_key', label: 'product_match_key', type: 'TEXT' },
  { key: 'created_at', label: 'created_at', type: 'TIMESTAMP' },
]

const GIFTLY_COLUMNS: { label: string; type: SqlType }[] = [
  { label: 'giftly_post_rate', type: 'FLOAT' },
  { label: 'giftly_sample_size', type: 'FLOAT' },
  { label: 'giftly_quality_dimensions', type: 'JSONB' },
  { label: 'giftly_match_confidence', type: 'FLOAT' },
  { label: 'giftly_last_updated_at', type: 'TIMESTAMP' },
]

function TypeBadge({ type }: { type: SqlType }) {
  const color: Record<SqlType, string> = {
    TEXT: 'bg-zinc-100 text-zinc-600',
    FLOAT: 'bg-emerald-50 text-emerald-700',
    JSONB: 'bg-violet-50 text-violet-700',
    TIMESTAMP: 'bg-amber-50 text-amber-800',
  }
  return (
    <span
      className={`ml-2 inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-medium tracking-wide uppercase ${color[type]}`}
    >
      {type}
    </span>
  )
}

function renderCatalogCell(p: EnrichedProduct, key: keyof EnrichedProduct) {
  const value = p[key]
  if (key === 'style_tags' && Array.isArray(value)) {
    return JSON.stringify(value)
  }
  if (key === 'price' && typeof value === 'number') {
    return value.toFixed(2)
  }
  if (key === 'created_at' && typeof value === 'string') {
    return value.replace('T', ' ').replace('Z', '')
  }
  return String(value)
}

function renderGiftlyCell(p: EnrichedProduct, key: string) {
  if (!p.signal) {
    return <span className="text-zinc-300">NULL</span>
  }
  switch (key) {
    case 'giftly_post_rate':
      return p.signal.post_rate.toFixed(2)
    case 'giftly_sample_size':
      return String(p.signal.sample_size)
    case 'giftly_quality_dimensions': {
      const q = p.signal.quality_dimensions
      return `{durability: ${q.durability}, fit: ${q.fit}, aesthetics: ${q.aesthetics}, ...}`
    }
    case 'giftly_match_confidence':
      return p.signal.match_confidence.toFixed(2)
    case 'giftly_last_updated_at':
      return p.signal.last_updated_at.replace('T', ' ').replace('Z', '')
    default:
      return ''
  }
}

export function CatalogSchemaTab() {
  const [enriched, setEnriched] = usePersistedState(
    'catalogEnrichmentEnabled',
    false
  )

  return (
    <div className="flex h-[calc(100vh-7rem)] bg-[#fafbfc]">
      {/* Left object explorer */}
      <aside className="w-56 shrink-0 border-r border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Objects
        </div>
        <nav className="px-1 py-2 text-[12.5px] text-zinc-700 font-mono">
          <Node label="DAYDREAM_PROD" icon="▾" depth={0} />
          <Node label="PUBLIC" icon="▾" depth={1} />
          <Node label="products" icon="▸" depth={2} selected />
          {enriched && (
            <div className="animate-[giftly-fade-in_0.5s_ease-out]">
              <Node label="giftly_signal" icon="▸" depth={2} />
            </div>
          )}
        </nav>
      </aside>

      {/* Right worksheet pane */}
      <section className="flex min-w-0 flex-1 flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-2">
          <div className="flex items-center gap-3 text-sm text-zinc-700">
            <span className="font-mono text-[12.5px] font-medium text-zinc-900">
              PRODUCTS_WORKSHEET.sql
            </span>
            <button
              type="button"
              className="rounded border border-zinc-300 bg-white px-2 py-0.5 text-[11px] text-zinc-600 hover:bg-zinc-50"
            >
              ▷ Run
            </button>
          </div>
          <EnrichmentToggle value={enriched} onChange={setEnriched} />
        </div>

        {/* SQL pane */}
        <div className="border-b border-zinc-200 bg-white">
          <SnowflakeSqlBlock sql={enriched ? JOIN_SQL : CATALOG_SQL} />
        </div>

        {/* Results pane */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-1.5 text-[11px] text-zinc-500">
            <span className="font-medium text-zinc-700">Results</span>
            <span>·</span>
            <span>{PRODUCTS.length} rows</span>
            <span>·</span>
            <span>{(283).toString()}ms</span>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full border-separate border-spacing-0 font-mono text-[11.5px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-zinc-50">
                  <th className="sticky left-0 z-20 border-b border-r border-zinc-200 bg-zinc-50 px-2 py-2 text-right font-normal text-zinc-400 w-10">
                    #
                  </th>
                  {CATALOG_COLUMNS.map((col) => (
                    <th
                      key={col.label}
                      className="border-b border-r border-zinc-200 bg-zinc-50 px-3 py-2 text-left font-medium text-zinc-700 whitespace-nowrap"
                    >
                      {col.label}
                      <TypeBadge type={col.type} />
                    </th>
                  ))}
                  {enriched &&
                    GIFTLY_COLUMNS.map((col, idx) => (
                      <th
                        key={col.label}
                        className={
                          'border-b border-r border-zinc-200 bg-[#f0f7ff] px-3 py-2 text-left font-medium text-sky-900 whitespace-nowrap ' +
                          (idx === 0 ? 'border-l-2 border-l-sky-300' : '')
                        }
                      >
                        {col.label}
                        <TypeBadge type={col.type} />
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {PRODUCTS.map((p, i) => (
                  <tr key={p.product_id} className="hover:bg-zinc-50/60">
                    <td className="sticky left-0 z-10 border-b border-r border-zinc-200 bg-white px-2 py-1.5 text-right text-zinc-400 tabular-nums">
                      {i + 1}
                    </td>
                    {CATALOG_COLUMNS.map((col) => (
                      <td
                        key={col.label}
                        className="border-b border-r border-zinc-200 bg-white px-3 py-1.5 text-zinc-800 whitespace-nowrap max-w-[260px] overflow-hidden text-ellipsis"
                        title={String(p[col.key] ?? '')}
                      >
                        {renderCatalogCell(p, col.key)}
                      </td>
                    ))}
                    {enriched &&
                      GIFTLY_COLUMNS.map((col, idx) => (
                        <td
                          key={col.label}
                          className={
                            'border-b border-r border-zinc-200 bg-[#f0f7ff]/60 px-3 py-1.5 text-zinc-800 whitespace-nowrap max-w-[260px] overflow-hidden text-ellipsis ' +
                            (idx === 0 ? 'border-l-2 border-l-sky-300' : '')
                          }
                        >
                          {renderGiftlyCell(p, col.label)}
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}

function Node({
  label,
  icon,
  depth,
  selected = false,
}: {
  label: string
  icon: string
  depth: number
  selected?: boolean
}) {
  return (
    <div
      className={
        'flex items-center gap-1.5 rounded-sm px-2 py-1 ' +
        (selected ? 'bg-sky-50 text-sky-800' : 'hover:bg-zinc-50')
      }
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
    >
      <span className="text-zinc-400 text-[10px]">{icon}</span>
      <span>{label}</span>
    </div>
  )
}

function EnrichmentToggle({
  value,
  onChange,
}: {
  value: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <div className="inline-flex items-center gap-0 rounded-full border border-zinc-300 bg-white p-0.5 text-[12px]">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={
          'rounded-full px-3 py-1 transition-colors ' +
          (!value
            ? 'bg-zinc-900 text-white'
            : 'text-zinc-600 hover:text-zinc-900')
        }
      >
        Daydream catalog only
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={
          'rounded-full px-3 py-1 transition-colors ' +
          (value
            ? 'bg-sky-600 text-white'
            : 'text-zinc-600 hover:text-zinc-900')
        }
      >
        + Giftly enrichment
      </button>
    </div>
  )
}
