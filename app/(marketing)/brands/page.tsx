import type { Metadata } from 'next'

import { Footer } from '@/components/site/footer'
import { Nav } from '@/components/site/nav'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

import { BrandForm } from './_components/brand-form'

export const metadata: Metadata = {
  title: 'for brands | giftly',
  description:
    'pay for results, not impressions. creator matching with commission-only payouts and no retainers.',
}

const FAQ: { q: string; a: string }[] = [
  {
    q: 'how much does it cost?',
    a: 'nothing upfront. no retainer. you cover product cost and shipping, plus commission on sales the creator drives. if nothing sells, you owe nothing beyond the product that shipped.',
  },
  {
    q: 'what’s the commission structure?',
    a: 'a percentage of revenue tracked through the creator’s affiliate link. exact split is set per campaign based on margin and category.',
  },
  {
    q: 'do you handle shipping logistics?',
    a: 'you ship product directly to the matched creator from your own fulfillment. we provide the address and confirm receipt.',
  },
  {
    q: 'how fast do we see results?',
    a: 'posts go up once the creator has used the product and decided they want to share it. sales attribution is real-time through your affiliate platform.',
  },
  {
    q: 'what categories do you work with?',
    a: 'growing dtc brands where the founder still knows their customers by name. strongest fit in beauty, skincare, supplements, wellness, apparel, home goods, food and beverage, pet, and fitness.',
  },
  {
    q: 'what if a creator doesn’t post?',
    a: 'then they don’t get paid. we don’t enforce posting because forced posts don’t convert. creators only earn on sales, so the incentives align automatically.',
  },
]

export default function BrandsPage() {
  return (
    <>
      <Nav />

      <main id="main" className="bg-cream">
        {/* HERO */}
        <section className="px-5 md:px-10 pt-32 md:pt-44 pb-16 md:pb-24">
          <div className="max-w-[1400px] mx-auto">
            <span className="text-xs tracking-[0.18em] uppercase text-muted-warm font-medium">
              for brands
            </span>
            <h1 className="mt-6 font-display text-[clamp(2.75rem,8vw,6.5rem)] leading-[0.95] tracking-tight max-w-[18ch]">
              pay for{' '}
              <span className="italic font-light text-coral underline">
                results
              </span>
              , not impressions.
            </h1>
            <p className="mt-8 max-w-[54ch] text-[1.1rem] md:text-[1.2rem] text-ink-soft leading-[1.6]">
              we match you with creators who’d use your product anyway. ship
              free. pay commission only on sales their link drives. no
              retainers, no minimum post counts.
            </p>
            <div className="mt-10">
              <a
                href="#apply"
                className="inline-flex items-center gap-2 bg-coral text-white px-7 py-4 text-[0.98rem] font-medium transition-all duration-200 hover:bg-coral-deep hover:-translate-y-0.5"
              >
                apply below
                <span aria-hidden="true">↓</span>
              </a>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-cream-warm py-20 md:py-28 px-5 md:px-10">
          <div className="max-w-[1100px] mx-auto">
            <div className="mb-10 md:mb-14">
              <span className="text-xs tracking-[0.18em] uppercase text-muted-warm font-medium">
                questions
              </span>
              <h2 className="mt-4 font-display text-[clamp(2rem,4vw,3.25rem)] leading-[1] tracking-tight">
                what you&rsquo;re probably wondering.
              </h2>
            </div>
            <Accordion
              type="single"
              collapsible
              className="border-y border-line/60"
            >
              {FAQ.map((item, i) => (
                <AccordionItem
                  key={item.q}
                  value={`item-${i}`}
                  className="border-b border-line/60 last:border-b-0"
                >
                  <AccordionTrigger className="py-6 md:py-7 font-display text-[1.2rem] leading-[1.2] tracking-tight hover:no-underline hover:text-coral transition-colors [&_svg]:text-coral">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="pb-6 md:pb-7 text-[1rem] text-ink-soft leading-[1.6] max-w-[60ch]">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* APPLY */}
        <section id="apply" className="py-20 md:py-28 px-5 md:px-10">
          <div className="max-w-[780px] mx-auto">
            <div className="mb-10 md:mb-12 text-center">
              <span className="text-xs tracking-[0.18em] uppercase text-muted-warm font-medium">
                apply
              </span>
              <h2 className="mt-4 font-display text-[clamp(2rem,4vw,3.25rem)] leading-[1] tracking-tight">
                tell us about your brand.
              </h2>
              <p className="mt-4 text-[1rem] text-ink-soft max-w-[46ch] mx-auto">
                takes a minute. we&rsquo;ll reply.
              </p>
            </div>
            <BrandForm />
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
