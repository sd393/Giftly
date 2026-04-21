import type { Metadata } from 'next'

import { Footer } from '@/components/site/footer'
import { Nav } from '@/components/site/nav'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

import { CreatorForm } from './_components/creator-form'

export const metadata: Metadata = {
  title: 'for creators | giftly',
  description:
    'free products. post only what you love. earn commission on every sale your link drives.',
}

const FAQ: { q: string; a: string }[] = [
  {
    q: 'do i have to post?',
    a: 'no. you keep whatever we send. if you love it, share your link. if you don’t, there’s no penalty and no follow-up pressure.',
  },
  {
    q: 'how do i get paid?',
    a: 'affiliate commission on sales attributed to your link. payout structure depends on the brand; we set it up per match.',
  },
  {
    q: 'how much can i earn?',
    a: 'depends on the brand, your audience, and how the post lands. we share the commission split for each match so you can decide if it’s worth it before anything ships.',
  },
  {
    q: 'what if i don’t like the product?',
    a: 'keep it, donate it, regift it. we’d rather you skip the post than fake one. honest signal is the point.',
  },
  {
    q: 'do i need a minimum following?',
    a: 'no hard floor. fit and engagement matter more than follower count.',
  },
  {
    q: 'is this like ltk or shopmy?',
    a: 'closer to ltk in that it’s commission-based. different in that we do the matching instead of leaving you to pitch brands yourself, and we send product without a posting requirement.',
  },
]

export default function CreatorsPage() {
  return (
    <>
      <Nav />

      <main id="main" className="bg-cream">
        {/* HERO */}
        <section className="px-5 md:px-10 pt-32 md:pt-44 pb-16 md:pb-24">
          <div className="max-w-[1400px] mx-auto">
            <span className="text-xs tracking-[0.18em] uppercase text-muted-warm font-medium">
              for creators
            </span>
            <h1 className="mt-6 font-display text-[clamp(2.75rem,8vw,6.5rem)] leading-[0.95] tracking-tight max-w-[16ch]">
              free products.{' '}
              <span className="italic font-light text-coral underline">
                real
              </span>{' '}
              commissions.
            </h1>
            <p className="mt-8 max-w-[52ch] text-[1.1rem] md:text-[1.2rem] text-ink-soft leading-[1.6]">
              apply once. we’ll match you with dtc brands whose products fit
              your niche. ship free. post only what you love. earn on what sells.
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
                tell us about yourself.
              </h2>
              <p className="mt-4 text-[1rem] text-ink-soft max-w-[46ch] mx-auto">
                takes a minute. we&rsquo;ll reply.
              </p>
            </div>
            <CreatorForm />
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
