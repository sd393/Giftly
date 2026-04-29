import type { AmazonProduct } from '../lib/types'

export function ProductCard({
  product,
  highlight,
}: {
  product: AmazonProduct
  highlight?: boolean
}) {
  return (
    <article
      className={
        'group bg-white p-3 flex flex-col gap-2 rounded-sm transition-shadow ' +
        (highlight
          ? 'ring-2 ring-[#FF9900] shadow-[0_4px_12px_-2px_rgba(255,153,0,0.35)]'
          : 'hover:shadow-[0_2px_6px_rgba(15,17,17,0.12)]')
      }
    >
      <div className="aspect-square bg-white flex items-center justify-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.imageUrl}
          alt={product.title}
          width={300}
          height={300}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </div>

      {product.sponsored ? (
        <p className="text-[0.7rem] text-[#565959]">Sponsored</p>
      ) : null}

      <h3 className="text-[0.92rem] leading-[1.25] text-[#0F1111] line-clamp-2 group-hover:text-[#C7511F] cursor-default">
        {product.title}
      </h3>

      <div className="flex items-center gap-1">
        <Stars rating={product.rating} />
        <span className="text-[0.78rem] text-[#007185]">
          {product.reviewCount.toLocaleString()}
        </span>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-[0.65rem] text-[#0F1111]/80">$</span>
        <span className="font-bold text-[1.4rem] tabular-nums text-[#0F1111] leading-none">
          {Math.floor(product.priceUsd)}
        </span>
        <sup className="text-[0.7rem] tabular-nums">
          {(product.priceUsd % 1).toFixed(2).slice(2)}
        </sup>
      </div>

      {product.prime ? (
        <p className="text-[0.78rem] text-[#0F1111]">
          <span className="text-[#0F1111] font-bold">prime</span>{' '}
          <span className="text-[#565959]">FREE delivery Wed, Sep 18</span>
        </p>
      ) : null}

      {highlight ? (
        <p className="mt-1 text-[0.7rem] uppercase tracking-[0.1em] font-bold text-[#FF9900]">
          Recommended via Giftly signal
        </p>
      ) : null}
    </article>
  )
}

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating)
  const half = rating - full >= 0.5
  return (
    <span className="flex items-center text-[#FFA41C]" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => {
        if (i < full) return <span key={i}>★</span>
        if (i === full && half)
          return (
            <span key={i} className="relative inline-block">
              <span className="text-[#D5D9D9]">★</span>
              <span
                className="absolute inset-0 overflow-hidden text-[#FFA41C]"
                style={{ width: '50%' }}
              >
                ★
              </span>
            </span>
          )
        return (
          <span key={i} className="text-[#D5D9D9]">
            ★
          </span>
        )
      })}
      <span className="ml-1 text-[0.78rem] text-[#0F1111] tabular-nums">
        {rating.toFixed(1)}
      </span>
    </span>
  )
}
