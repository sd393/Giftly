'use client'

import { Heart } from 'lucide-react'

import type { ConsumerCard } from '../lib/types'

export function ProductCard({ card }: { card: ConsumerCard }) {
  return (
    <div className="group relative flex w-[200px] shrink-0 flex-col">
      <div className="relative aspect-[3/4] overflow-hidden rounded-md border border-zinc-200 bg-zinc-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card.image_url}
          alt={card.name}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />
        <button
          type="button"
          aria-label="save"
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-zinc-700 backdrop-blur hover:bg-white"
        >
          <Heart className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
        <span
          aria-hidden
          className="absolute bottom-2 left-2 text-[20px] leading-none text-indigo-600"
          style={{ fontFamily: 'serif' }}
        >
          ✦
        </span>
      </div>
      <div className="mt-2.5 space-y-0.5 px-0.5">
        <div className="text-[9.5px] uppercase tracking-[0.18em] text-zinc-500">
          {card.brand}
        </div>
        <div className="line-clamp-1 text-[12.5px] text-zinc-900">
          {card.name}
        </div>
        <div className="text-[12px] text-zinc-700 tabular-nums">
          ${card.price.toFixed(card.price % 1 === 0 ? 0 : 2)}
        </div>
      </div>
    </div>
  )
}
