'use client'

import Image from 'next/image'

import { MATCH_ROWS, MATCH_STATS } from '../lib/matching'

function ConfidenceCell({ value }: { value: number }) {
  const color =
    value >= 0.9
      ? 'text-emerald-700 bg-emerald-500'
      : value >= 0.7
        ? 'text-amber-700 bg-amber-500'
        : 'text-rose-700 bg-rose-500'
  const [textCls, dotCls] = color.split(' ')
  return (
    <span className={`inline-flex items-center gap-2 font-mono ${textCls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotCls}`} />
      {value.toFixed(2)}
    </span>
  )
}

function ProductCell({
  brand,
  name,
  thumbnail_url,
}: {
  brand: string
  name: string
  thumbnail_url: string
}) {
  return (
    <div className="flex items-center gap-3">
      <Image
        src={thumbnail_url}
        alt=""
        width={40}
        height={40}
        unoptimized
        className="h-10 w-10 shrink-0 rounded object-cover bg-zinc-100"
      />
      <div className="min-w-0">
        <div className="text-[10.5px] uppercase tracking-wider text-zinc-500">
          {brand}
        </div>
        <div className="truncate text-[13px] text-zinc-900">{name}</div>
      </div>
    </div>
  )
}

export function ProductMatchingTab() {
  return (
    <div className="min-h-[calc(100vh-7rem)] bg-white">
      <div className="border-b border-zinc-200 px-8 py-5">
        <h1 className="text-[15px] font-semibold text-zinc-900">
          Product matching
        </h1>
        <p className="mt-1 text-[12.5px] text-zinc-500">
          Giftly seeded catalog × Daydream partner catalog, joined on
          normalized brand+SKU key.
        </p>
      </div>

      <div className="flex items-center justify-between border-b border-zinc-200 px-8 py-3">
        <div className="text-[12.5px] text-zinc-600">
          <span className="font-medium text-zinc-900">{MATCH_STATS.total}</span>{' '}
          products ·{' '}
          <span className="font-medium text-zinc-900">
            {MATCH_STATS.matched}
          </span>{' '}
          matched ·{' '}
          <span className="font-medium text-zinc-900">
            {MATCH_STATS.matchRatePct}%
          </span>{' '}
          match rate
        </div>
        <div className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] text-zinc-600">
          Threshold: 0.50
        </div>
      </div>

      <div className="px-8 py-2">
        <table className="w-full border-separate border-spacing-0 text-[13px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-zinc-500">
              <th className="border-b border-zinc-200 px-2 py-2 text-right font-normal w-10">
                #
              </th>
              <th className="border-b border-zinc-200 px-3 py-2 text-left font-medium">
                Giftly seeded
              </th>
              <th className="border-b border-zinc-200 px-3 py-2 text-left font-medium">
                Daydream catalog match
              </th>
              <th className="border-b border-zinc-200 px-3 py-2 text-left font-medium w-32">
                Confidence
              </th>
              <th className="border-b border-zinc-200 px-3 py-2 text-left font-medium w-56">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {MATCH_ROWS.map((row, i) => (
              <tr key={i} className="hover:bg-zinc-50/70">
                <td className="border-b border-zinc-100 px-2 py-3 text-right text-zinc-400 tabular-nums">
                  {i + 1}
                </td>
                <td className="border-b border-zinc-100 px-3 py-3">
                  <ProductCell {...row.giftly_product} />
                </td>
                <td className="border-b border-zinc-100 px-3 py-3">
                  {row.daydream_product ? (
                    <ProductCell {...row.daydream_product} />
                  ) : (
                    <span className="text-zinc-400">
                      — no candidate ≥ 0.50 threshold
                    </span>
                  )}
                </td>
                <td className="border-b border-zinc-100 px-3 py-3">
                  <ConfidenceCell value={row.confidence} />
                </td>
                <td className="border-b border-zinc-100 px-3 py-3 text-[12px]">
                  {row.status === 'matched' ? (
                    <span className="text-zinc-500">joined</span>
                  ) : (
                    <span className="text-rose-600">
                      below threshold — not joined
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-8 py-3 text-[11px] text-zinc-500">
        <div className="inline-flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          production
        </div>
        <div>matching_v3 · last refreshed 2026-05-11 08:00 UTC</div>
      </div>
    </div>
  )
}
