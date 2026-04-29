import { Plus } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import { PRODUCT } from '../lib/mock-data'

export function ProductsTab() {
  return (
    <div>
      <article className="bg-white border border-line/60 rounded-md overflow-hidden flex flex-col md:flex-row">
        <div className="md:w-56 shrink-0 bg-cream-warm/60 aspect-square md:aspect-auto md:self-stretch flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={PRODUCT.imageUrl}
            alt={PRODUCT.name}
            width={400}
            height={400}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>

        <div className="p-6 md:p-7 flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge className="text-[0.65rem] uppercase tracking-[0.1em]">
              active
            </Badge>
            <span className="text-[0.75rem] text-muted-warm">
              {PRODUCT.status}
            </span>
          </div>
          <h3 className="font-display text-[1.4rem] tracking-tight">
            {PRODUCT.name}
          </h3>
          <p className="mt-1 text-[0.9rem] text-ink-soft">{PRODUCT.tagline}</p>

          <dl className="mt-5 grid grid-cols-2 gap-4 text-[0.85rem]">
            <div>
              <dt className="text-[0.7rem] uppercase tracking-[0.1em] text-muted-warm">
                retail price
              </dt>
              <dd className="mt-0.5 text-ink">${PRODUCT.retailPriceUsd}</dd>
            </div>
            <div>
              <dt className="text-[0.7rem] uppercase tracking-[0.1em] text-muted-warm">
                affiliate commission
              </dt>
              <dd className="mt-0.5 text-coral font-medium">
                {PRODUCT.commissionPct}%
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-[0.7rem] uppercase tracking-[0.1em] text-muted-warm">
                active ingredients
              </dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {PRODUCT.ingredients.map((i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="text-[0.7rem] font-normal"
                  >
                    {i}
                  </Badge>
                ))}
              </dd>
            </div>
          </dl>
        </div>
      </article>

      <div className="mt-4">
        <Button variant="outline" size="sm" disabled>
          <Plus aria-hidden="true" />
          Add product
        </Button>
      </div>
    </div>
  )
}
