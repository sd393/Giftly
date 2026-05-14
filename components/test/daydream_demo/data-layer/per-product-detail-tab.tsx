'use client'

import { useState } from 'react'

import { PRODUCTS } from '../lib/products'
import type { CreatorVideo, EnrichedProduct } from '../lib/types'
import { QualityBarChart } from './quality-bar-chart'
import { VideoModal } from './video-modal'

// Hardcoded for the demo — photogenic, high-confidence row.
const FOCUS_PRODUCT_ID = 'p_khaite_italo'

function findFocusProduct(): EnrichedProduct {
  const p = PRODUCTS.find((x) => x.product_id === FOCUS_PRODUCT_ID)
  if (!p) throw new Error(`Focus product not found: ${FOCUS_PRODUCT_ID}`)
  return p
}

const PLATFORM_ICON: Record<CreatorVideo['platform'], string> = {
  tiktok: 'TT',
  instagram: 'IG',
}

function formatDate(iso: string) {
  return iso.slice(0, 10)
}

function CatalogField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 border-b border-zinc-100 py-2">
      <dt className="text-[11px] uppercase tracking-wider text-zinc-500">
        {label}
      </dt>
      <dd className="font-mono text-[12px] text-zinc-800 break-words">
        {children}
      </dd>
    </div>
  )
}

export function PerProductDetailTab() {
  const product = findFocusProduct()
  const signal = product.signal
  const [openVideo, setOpenVideo] = useState<CreatorVideo | null>(null)

  if (!signal) {
    // Should not happen — focus product is always enriched.
    return null
  }

  return (
    <div className="min-h-[calc(100vh-7rem)] bg-white">
      <header className="border-b border-zinc-200 bg-zinc-50 px-8 py-3">
        <h1 className="text-[13px] text-zinc-900">
          <span className="font-semibold">QA View:</span>{' '}
          <span className="text-zinc-600">
            spot-check Giftly signal against creator evidence
          </span>
        </h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] divide-x divide-zinc-200">
        {/* Left pane — catalog record */}
        <section className="px-8 py-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-[11px] uppercase tracking-wider text-zinc-500">
              Catalog record
            </h2>
            <code className="text-[10.5px] text-zinc-400">
              products.{product.product_id}
            </code>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.image_url}
            alt={product.name}
            className="mb-5 w-full max-w-md rounded-lg border border-zinc-200 object-cover aspect-[3/4] bg-zinc-100"
          />
          <dl>
            <CatalogField label="product_id">{product.product_id}</CatalogField>
            <CatalogField label="brand">{product.brand}</CatalogField>
            <CatalogField label="name">{product.name}</CatalogField>
            <CatalogField label="description">
              {product.description}
            </CatalogField>
            <CatalogField label="price">${product.price.toFixed(2)}</CatalogField>
            <CatalogField label="style_tags">
              <div className="flex flex-wrap gap-1">
                {product.style_tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[10.5px] text-zinc-700"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </CatalogField>
            <CatalogField label="vector_embedding_id">
              {product.vector_embedding_id}
            </CatalogField>
            <CatalogField label="product_match_key">
              {product.product_match_key}
            </CatalogField>
            <CatalogField label="created_at">{product.created_at}</CatalogField>
          </dl>
        </section>

        {/* Right pane — Giftly enrichment */}
        <section className="px-8 py-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-[11px] uppercase tracking-wider text-zinc-500">
              Giftly enrichment
            </h2>
            <code className="text-[10.5px] text-zinc-400">
              giftly_signal.{signal.product_match_key}
            </code>
          </div>

          <div className="mb-6 flex items-end gap-6">
            <div>
              <div className="text-[10.5px] uppercase tracking-wider text-zinc-500">
                post rate
              </div>
              <div className="font-serif text-5xl font-light text-zinc-900 leading-none">
                {Math.round(signal.post_rate * 100)}%
              </div>
            </div>
            <div className="pb-1">
              <div className="text-[10.5px] uppercase tracking-wider text-zinc-500">
                panel
              </div>
              <div className="text-[13px] text-zinc-700">
                n={signal.sample_size} creators seeded
              </div>
            </div>
            <div className="pb-1">
              <div className="text-[10.5px] uppercase tracking-wider text-zinc-500">
                match confidence
              </div>
              <div className="text-[13px] text-zinc-700 font-mono">
                {signal.match_confidence.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="mb-7">
            <h3 className="mb-3 text-[11px] uppercase tracking-wider text-zinc-500">
              Quality dimensions
            </h3>
            <QualityBarChart dimensions={signal.quality_dimensions} />
          </div>

          <div className="mb-4">
            <h3 className="mb-3 text-[11px] uppercase tracking-wider text-zinc-500">
              Creator video evidence
            </h3>
            <div className="grid grid-cols-3 gap-2.5">
              {signal.creator_videos.map((v) => (
                <button
                  key={v.handle + v.thumbnail_url}
                  type="button"
                  onClick={() => setOpenVideo(v)}
                  className="group relative aspect-[9/16] overflow-hidden rounded-md border border-zinc-200 bg-zinc-100 text-left"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={v.thumbnail_url}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0" />
                  <span className="absolute inset-x-2 bottom-1.5 flex items-center justify-between text-white">
                    <span className="truncate text-[10.5px] font-medium">
                      {v.handle}
                    </span>
                    <span className="rounded bg-white/20 px-1 py-0.5 text-[8.5px] font-semibold uppercase tracking-wider backdrop-blur-sm">
                      {PLATFORM_ICON[v.platform]}
                    </span>
                  </span>
                  <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-zinc-900">
                      ▶
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <footer className="mt-6 text-[11px] text-zinc-500">
            first seeded: {formatDate(signal.first_seeded_at)} · last updated:{' '}
            {formatDate(signal.last_updated_at)}
          </footer>
        </section>
      </div>

      <VideoModal
        open={!!openVideo}
        onOpenChange={(next) => {
          if (!next) setOpenVideo(null)
        }}
        video={openVideo}
      />
    </div>
  )
}
