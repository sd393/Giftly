'use client'

import Image from 'next/image'
import { Star } from 'lucide-react'

import type { Sku } from './lib/types'

export function ProductHero({ sku }: { sku: Sku }) {
  return (
    <article className="bg-white border border-[#e5e1dc] rounded-2xl p-6 sm:p-8 flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
        <div className="bg-[#fafaf7] border border-[#ece8e1] rounded-xl flex items-center justify-center p-4 aspect-[3/4] md:aspect-auto md:min-h-[340px] overflow-hidden">
          <Image
            src={sku.imageSrc}
            alt={`${sku.brand} ${sku.name}`}
            width={720}
            height={960}
            className="object-contain w-auto h-full max-h-[420px]"
            priority
          />
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[#8a7566] font-semibold">
            {sku.brand}
          </p>
          <h2 className="text-[26px] sm:text-[28px] font-semibold text-[#2a1a12] leading-tight">
            {sku.name}
          </h2>

          <div className="flex items-center gap-2 text-[13px] text-[#4d3828]">
            <span className="flex items-center gap-0.5 text-amber-500">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star
                  key={i}
                  className="size-3.5"
                  fill={i < Math.round(sku.rating) ? 'currentColor' : 'none'}
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              ))}
            </span>
            <span className="font-medium">{sku.rating.toFixed(1)}</span>
            <span className="text-[#8a7566]">({sku.reviewCount})</span>
            <span className="text-[#8a7566]">·</span>
            <span className="text-[#8a7566]">{sku.size}</span>
          </div>

          <p className="text-[14px] leading-[1.55] text-[#4d3828] mt-1">
            {sku.description}
          </p>

          <div className="flex items-baseline gap-3 mt-2">
            <span className="text-[26px] font-semibold text-[#2a1a12]">
              ${(sku.priceCents / 100).toFixed(2)}
            </span>
            <span className="text-[12px] text-[#8a7566]">
              free shipping over ${sku.freeShippingThreshold}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-1">
            <span className="bg-[#f1e6d4] text-[#2a1a12] text-[11.5px] font-medium px-2.5 py-1 rounded-full">
              Subscribe · {Math.round(sku.subscribeRewardRate * 100)}% rewards
            </span>
            <span className="bg-white border border-[#e5e1dc] text-[#4d3828] text-[11.5px] font-medium px-2.5 py-1 rounded-full">
              Buy once · {Math.round(sku.buyOnceRewardRate * 100)}% rewards
            </span>
          </div>
        </div>
      </div>

      <hr className="border-[#ece8e1]" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a7566] font-semibold mb-2">
            Why we love it
          </p>
          <ul className="space-y-1.5 text-[13.5px] text-[#4d3828] leading-[1.55] list-disc pl-5">
            {sku.whyWeLoveIt.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a7566] font-semibold mb-2">
            Grove Values
          </p>
          <div className="flex flex-wrap gap-1.5">
            {sku.groveValues.map((v) => (
              <span
                key={v}
                className="bg-[#f6f1e8] border border-[#ece8e1] text-[#2a1a12] text-[11.5px] px-2.5 py-1 rounded-full"
              >
                {v}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  )
}
