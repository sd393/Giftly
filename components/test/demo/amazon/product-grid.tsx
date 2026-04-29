'use client'

import { motion } from 'framer-motion'
import { useMemo } from 'react'

import {
  AMAZON_PRODUCTS,
  ORDER_WITHOUT_GIFTLY,
  ORDER_WITH_GIFTLY,
} from '../lib/mock-data'
import type { RufusMode } from '../lib/types'

import { ProductCard } from './product-card'

export function ProductGrid({ mode }: { mode: RufusMode }) {
  const ordered = useMemo(() => {
    const order = mode === 'with' ? ORDER_WITH_GIFTLY : ORDER_WITHOUT_GIFTLY
    return order
      .map((id) => AMAZON_PRODUCTS.find((p) => p.id === id))
      .filter((p): p is (typeof AMAZON_PRODUCTS)[number] => Boolean(p))
  }, [mode])

  return (
    <div>
      <header className="mb-3">
        <p className="text-[0.78rem] text-[#565959]">
          1-{ordered.length} of over 6,000 results for{' '}
          <span className="text-[#C7511F] font-medium">
            &ldquo;dandruff shampoo&rdquo;
          </span>
        </p>
        <h2 className="font-bold text-[1.05rem] mt-0.5 text-[#0F1111]">
          Results
        </h2>
        <p className="text-[0.75rem] text-[#565959]">
          Check each product page for other buying options.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {ordered.map((p, i) => {
          const isFeaturedTop = mode === 'with' && i === 0 && p.id === 'C'
          return (
            <motion.div
              key={p.id}
              layout
              animate={
                isFeaturedTop
                  ? { scale: [1, 1.04, 1] }
                  : { scale: 1 }
              }
              transition={{
                layout: { type: 'spring', duration: 0.4, bounce: 0.18 },
                scale: { duration: 0.55, ease: 'easeInOut', times: [0, 0.5, 1] },
              }}
            >
              <ProductCard product={p} highlight={isFeaturedTop} />
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
