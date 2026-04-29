import { cn } from '@/lib/utils'

import { PRODUCT_SUMMARY } from '../lib/mock-data'
import type { ProductSummary } from '../lib/types'

export function ProductSummaryView() {
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PRODUCT_SUMMARY.map((p) => (
          <SummaryCard key={p.id} product={p} />
        ))}
      </div>

      <p className="mt-8 max-w-[64ch] font-display italic font-light text-[1.05rem] md:text-[1.15rem] leading-[1.5] text-ink-soft border-l-2 border-coral pl-5">
        Post rate among non-paid, no-obligation creator recipients is the
        cleanest available signal of organic product preference. This is the
        row of data Giftly produces that does not exist anywhere else.
      </p>
    </div>
  )
}

function SummaryCard({ product }: { product: ProductSummary }) {
  const featured = product.isFeatured
  return (
    <article
      className={cn(
        'rounded-md p-5 md:p-6 border flex flex-col h-full',
        featured
          ? 'bg-white border-coral/40 shadow-[0_8px_24px_-16px_rgba(229,90,78,0.35)]'
          : 'bg-white/70 border-line/60'
      )}
    >
      <header>
        <p
          className={cn(
            'text-[0.7rem] uppercase tracking-[0.18em] font-medium',
            featured ? 'text-coral' : 'text-muted-warm'
          )}
        >
          {featured ? 'Lumina Pro' : 'competitor'}
        </p>
        <h3 className="mt-1 font-display text-[1.2rem] tracking-tight">
          {product.name}
        </h3>
      </header>

      <div className="mt-5">
        <p className="text-[0.65rem] uppercase tracking-[0.15em] text-muted-warm font-medium">
          post rate
        </p>
        <PostRateBar rate={product.postRate} featured={featured} />
        <p className="mt-1.5 text-[0.75rem] text-muted-warm">
          {product.postCountText}
        </p>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 text-[0.85rem]">
        <div>
          <dt className="text-[0.65rem] uppercase tracking-[0.1em] text-muted-warm">
            avg sentiment
          </dt>
          <dd
            className={cn(
              'mt-0.5 tabular-nums',
              featured ? 'text-coral font-medium' : 'text-ink-soft'
            )}
          >
            {product.avgSentiment.toFixed(1)}
          </dd>
        </div>
        <div>
          <dt className="text-[0.65rem] uppercase tracking-[0.1em] text-muted-warm">
            conversion
          </dt>
          <dd
            className={cn(
              'mt-0.5 tabular-nums',
              featured ? 'text-coral font-medium' : 'text-ink-soft'
            )}
          >
            {product.conversionPct}%
          </dd>
        </div>
      </dl>

      <div className="mt-auto pt-5">
        <p className="text-[0.65rem] uppercase tracking-[0.1em] text-muted-warm font-medium">
          {product.topThemeLabel.toLowerCase()}
        </p>
        <p
          className={cn(
            'mt-1 font-display italic text-[0.95rem] leading-[1.4]',
            featured ? 'text-ink' : 'text-ink-soft'
          )}
        >
          &ldquo;{product.topThemeQuote}&rdquo;
        </p>
      </div>
    </article>
  )
}

function PostRateBar({
  rate,
  featured,
}: {
  rate: number
  featured: boolean
}) {
  const pct = Math.round(rate * 1000) / 10 // one decimal place
  return (
    <div className="mt-2">
      <div className="flex items-baseline justify-between mb-1">
        <span
          className={cn(
            'font-display tabular-nums',
            featured ? 'text-[1.85rem] text-coral' : 'text-[1.5rem] text-ink'
          )}
        >
          {pct}%
        </span>
      </div>
      <div className="relative h-2.5 rounded-full bg-line/50 overflow-hidden">
        <div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full',
            featured ? 'bg-coral' : 'bg-muted-warm/50'
          )}
          style={{ width: `${Math.max(pct, 1.5)}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  )
}
