'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useState } from 'react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { ProductHero } from './product-hero'
import { SKUS } from './lib/skus'
import type { UcpView } from './lib/types'
import { UcpInspector } from './ucp-inspector'

export function SkuUcpPage() {
  const [skuId, setSkuId] = useState(SKUS[0].id)
  const [view, setView] = useState<UcpView>('baseline')

  const sku = SKUS.find((s) => s.id === skuId) ?? SKUS[0]

  return (
    <div className="min-h-screen bg-[#f6eee3] text-[#2a1a12]">
      <header className="border-b border-[#e5e1dc] bg-white/70 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-semibold tracking-tight text-[16px]">
              Giftly
            </span>
            <span className="text-[#8a7566] text-[13px]">
              · SKU UCP View
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/retailer-demo"
              className="hidden sm:inline-flex items-center gap-1.5 text-[13px] text-[#4d3828] hover:text-[#2a1a12] px-3 py-1.5 rounded-full hover:bg-[#f1e6d4] transition-colors"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              Chat demo
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-8 flex flex-col gap-6">
        <section className="flex flex-col gap-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#8a7566] font-semibold">
            Grove Collaborative · catalog inspector
          </p>
          <h1 className="text-[28px] sm:text-[32px] font-semibold leading-tight">
            How Grove&apos;s listings look to AI shopping agents
          </h1>
          <p className="text-[14.5px] text-[#4d3828] max-w-[760px] leading-[1.6]">
            Each SKU below renders in its UCP form — the same structured
            shape Google, Amazon, and other agents already read. Switch the
            view to see exactly what the Giftly enrichment adds, where it
            lives in the schema, and which fields stay untouched.
          </p>
        </section>

        <section className="bg-white border border-[#e5e1dc] rounded-2xl px-5 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <label
              htmlFor="sku-picker"
              className="text-[12px] uppercase tracking-[0.14em] text-[#8a7566] font-semibold"
            >
              SKU
            </label>
            <Select value={skuId} onValueChange={setSkuId}>
              <SelectTrigger
                id="sku-picker"
                className="min-w-[320px] bg-white border-[#e5e1dc] text-[13.5px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SKUS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="font-medium">{s.brand}</span>
                    <span className="text-[#8a7566] ml-1">· {s.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-[11.5px] text-[#8a7566] font-mono">
            {sku.id}
          </p>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,520px)_minmax(0,1fr)] gap-6">
          <ProductHero sku={sku} />
          <UcpInspector sku={sku} view={view} onViewChange={setView} />
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#e5e1dc]">
          <p className="text-[12px] text-[#8a7566] max-w-[640px] leading-[1.55]">
            UCP shape mirrors schema.org Product + Offer. Giftly attestations
            attach to <span className="font-mono">offers[].x_giftly</span> at
            the seller-listing level. Synthetic attestation data shown for
            illustration; pricing reflects current grove.co listing.
          </p>
          <Link
            href="/retailer-demo"
            className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[#c84538] hover:text-[#a83a2f] transition-colors"
          >
            See how this changes the Gemini answer
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </footer>
      </main>
    </div>
  )
}
