'use client'

import { ArrowUpRight, ShieldCheck } from 'lucide-react'

import { PRODUCT } from './lib/product'
import styles from './styles.module.css'

export function GroveListingCard() {
  const grove = PRODUCT.sellers.find((s) => s.domain === 'grove.co')!
  const sig = PRODUCT.giftly_signal

  return (
    <div className={styles.groveCard}>
      <span className={styles.groveChip}>
        <ShieldCheck className="size-3" aria-hidden="true" />
        giftly · {sig.signal_score.toFixed(2)} signal
      </span>

      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[12.5px] uppercase tracking-[0.12em] text-[#fdba74] font-semibold leading-tight">
            Buy from Grove
          </p>
          <p className="text-[14.5px] font-semibold text-white mt-1 leading-tight">
            {PRODUCT.name}
          </p>
          <p className="text-[12px] text-white/55 mt-0.5">
            {PRODUCT.brand} · {PRODUCT.size}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[15px] font-semibold text-white">
            ${grove.price.toFixed(2)}
          </p>
          <p className="text-[11.5px] text-white/45">{grove.shipping}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-[11.5px] text-white/55 border-t border-white/[0.06] pt-3">
        <div>
          <p className="text-white/85 font-medium text-[13px]">
            {sig.attestation_count}
          </p>
          <p>attestations</p>
        </div>
        <div>
          <p className="text-white/85 font-medium text-[13px]">
            {sig.unique_creators}
          </p>
          <p>creators</p>
        </div>
        <div>
          <p className="text-white/85 font-medium text-[13px]">top decile</p>
          <p>haircare signal</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {sig.top_use_cases.map((u) => (
          <span
            key={u}
            className="text-[11px] text-white/65 bg-white/[0.04] border border-white/[0.05] rounded-full px-2.5 py-0.5"
          >
            {u}
          </span>
        ))}
      </div>

      <a
        href="#"
        onClick={(e) => e.preventDefault()}
        className={styles.groveLink}
      >
        View on grove.co{' '}
        <ArrowUpRight className="inline size-3.5 -mt-0.5" aria-hidden="true" />
      </a>
    </div>
  )
}
