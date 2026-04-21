import Image from 'next/image'
import Link from 'next/link'

import { Nav } from '@/components/site/nav'
import { Footer } from '@/components/site/footer'
import { PathCard } from '@/components/site/path-card'
import { QuoteCard } from '@/components/site/quote-card'

const NICHES = [
  'skincare',
  'supplements',
  'apparel',
  'home goods',
  'food & beverage',
  'beauty',
  'wellness',
  'pet',
  'baby',
  'fitness',
]

export default function Home() {
  return (
    <>
      <Nav />

      <main id="main">
        {/* HERO */}
        <section className="relative w-full h-screen overflow-hidden bg-ink">
          <Image
            src="/hero.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-bottom"
          />

          {/* overlay card */}
          <div className="absolute top-[4.5rem] left-5 right-5 md:right-10 md:top-24 md:left-auto max-w-none md:max-w-[36rem] bg-white/90 backdrop-blur-xl text-ink p-7 md:p-10 shadow-lg z-30">
            <p className="text-xs tracking-[0.18em] uppercase font-medium text-ink mb-4">
              GIFTLY
            </p>
            <h1 className="font-display text-[2rem] md:text-[2.75rem] leading-[1.1] tracking-tight mb-5">
              helping the right{' '}
              <span className="italic font-light text-coral underline">
                products
              </span>
              <br />
              find the right{' '}
              <span className="italic font-light text-coral underline">
                people
              </span>
            </h1>
            <p className="text-[0.95rem] leading-[1.55] text-ink-soft mb-6">
              giftly matches dtc brands with vetted creators. products ship
              free, no strings. creators post only if they love it. brands pay
              commission only when sales happen.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/creators"
                className="group inline-flex items-center gap-2 bg-coral text-white px-5 py-2.5 text-[0.9rem] font-medium transition-all duration-200 hover:bg-coral-deep hover:-translate-y-0.5"
              >
                i&rsquo;m a creator
                <span
                  aria-hidden="true"
                  className="transition-transform duration-200 group-hover:translate-x-1"
                >
                  →
                </span>
              </Link>
              <Link
                href="/brands"
                className="group inline-flex items-center gap-2 bg-coral text-white px-5 py-2.5 text-[0.9rem] font-medium transition-all duration-200 hover:bg-coral-deep hover:-translate-y-0.5"
              >
                i&rsquo;m a brand
                <span
                  aria-hidden="true"
                  className="transition-transform duration-200 group-hover:translate-x-1"
                >
                  →
                </span>
              </Link>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 flex items-end justify-start pointer-events-none z-10">
            <span
              aria-hidden="true"
              className="block font-display font-normal uppercase leading-none text-coral text-[24vw] select-none translate-y-[0.1em]"
            >
              GIFTLY
            </span>
          </div>

          <Image
            src="/hand.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-bottom z-20 pointer-events-none"
          />
        </section>

        {/* MARQUEE */}
        <section
          aria-hidden="true"
          className="py-8 bg-white/90 backdrop-blur-xl overflow-hidden"
        >
          <div className="flex gap-16 w-max motion-safe:animate-marquee hover:[animation-play-state:paused]">
            {[...NICHES, ...NICHES].map((n, i) => (
              <span
                key={`${n}-${i}`}
                className="font-sans text-[1.75rem] text-ink whitespace-nowrap flex items-center gap-16"
              >
                {n}
                <span aria-hidden="true" className="text-coral not-italic text-[0.75rem]">
                  ✶
                </span>
              </span>
            ))}
          </div>
        </section>

        {/* TWO PATHS */}
        <section className="max-w-[1400px] mx-auto px-5 md:px-10 py-20 md:py-32">
          <div className="max-w-[800px] mb-16">
            <span className="text-xs tracking-[0.18em] uppercase text-muted-warm font-medium">two sides, one table</span>
            <h2 className="mt-4 mb-6 font-display text-[clamp(2.5rem,5vw,4.25rem)] leading-[0.95] tracking-tight">
              pick your{' '}
              <span className="font-display italic font-light text-coral">side</span>
              .
            </h2>
            <p className="text-[1.15rem] text-ink-soft max-w-[52ch]">
              creator-brand matching, the way it should&rsquo;ve worked from the
              start. no upfront fees, no forced posts, no contracts you need a
              lawyer to read.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PathCard
              variant="creator"
              label="for creators"
              title="free products."
              titleEm="real commissions"
              bullets={[
                { num: '01', text: 'products that match your niche, not random pr spam' },
                { num: '02', text: 'keep everything we send. posting is optional.' },
                { num: '03', text: 'earn commission on every sale your link drives' },
                { num: '04', text: 'get paid on real sales, not vague engagement' },
              ]}
              ctaLabel="apply as a creator"
              ctaHref="/creators"
            />

            <PathCard
              variant="brand"
              label="for brands"
              title="pay for"
              titleEm="results, not impressions"
              bullets={[
                { num: '01', text: 'vetted creators whose audience matches your customer' },
                { num: '02', text: 'no upfront fees, no fixed retainers, no contracts' },
                { num: '03', text: 'we manage the matching, outreach, and follow-through' },
                { num: '04', text: 'commission only. you pay when a sale closes.' },
              ]}
              ctaLabel="apply as a brand"
              ctaHref="/brands"
            />
          </div>
        </section>


        {/* THESIS */}
        <section className="bg-cream-warm py-24 md:py-40 px-5 md:px-10">
          <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-[1fr_1.3fr] gap-12 md:gap-24 items-start">
            <div>
              <span className="text-xs tracking-[0.18em] uppercase text-muted-warm font-medium">why we&rsquo;re building this</span>
              <h2 className="mt-6 mb-8 font-display text-[clamp(2.25rem,3.5vw,3rem)] leading-[0.95] tracking-tight">
                we&rsquo;re not an agency. we&rsquo;re{' '}
                <span className="font-display italic font-light text-coral">
                  students
                </span>
                .
              </h2>
              <p className="text-ink-soft text-[1.05rem] leading-[1.65] mb-5">
                we grew up on tiktok and instagram. we watched dtc brands torch
                cash on influencer campaigns that converted like bad search ads,
                and we watched creators accept boxes of stuff they&rsquo;d never
                actually use.
              </p>
              <p className="text-ink-soft text-[1.05rem] leading-[1.65]">
                both sides were losing. the fix wasn&rsquo;t another dashboard.
                it was doing the matching honestly, taking a cut only when it
                worked, and getting out of the way.
              </p>
            </div>

            <blockquote className="font-display font-light text-[clamp(1.75rem,3vw,2.75rem)] leading-[1.2] tracking-[-0.015em] text-ink relative pl-10">
              <span
                aria-hidden="true"
                className="absolute left-0 top-[0.5em] w-1 h-[calc(100%-1em)] bg-coral"
              />
              authentic posts{' '}
              <em className="not-italic font-display italic text-coral-deep">
                out-convert
              </em>{' '}
              paid ads every time. the trick is making sure the creator actually
              loves the product.
            </blockquote>
          </div>
        </section>

        {/* PROOF */}
        <section className="max-w-[1400px] mx-auto px-5 md:px-10 py-16 md:py-24 pb-24 md:pb-40">
          <div className="flex flex-wrap items-baseline justify-between gap-4 mb-12">
            <h2 className="font-display text-[clamp(2rem,3.5vw,3rem)] leading-[0.95] tracking-tight">
              what they&rsquo;re{' '}
              <span className="font-display italic font-light text-coral">
                saying
              </span>
              .
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <QuoteCard
              body="finally a platform that actually vets creators. the ones they sent us posted — and the ones who posted drove real sales."
              attrName="founder, skincare brand"
              attrDetail="dtc"
            />
            <QuoteCard
              variant="coral"
              body="i get pr boxes constantly and most of it goes straight to the donation bin. giftly sends stuff i actually use."
              attrName="creator, lifestyle"
              attrDetail="instagram + tiktok"
            />
            <QuoteCard
              body="no contracts. no hostage fees. you match us with someone who genuinely posts and we pay commission. this should've existed years ago."
              attrName="founder, supplement brand"
              attrDetail="shopify-native"
            />
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="relative overflow-hidden bg-ink text-cream text-center px-5 md:px-10 pt-24 md:pt-32 pb-16 md:pb-24">
          <h2 className="relative font-display text-[clamp(2.5rem,6vw,5.5rem)] leading-[0.95] tracking-tight max-w-[18ch] mx-auto mb-8">
            let&rsquo;s make something{' '}
            <span className="font-display italic font-light text-coral-pale">
              worth posting
            </span>
            .
          </h2>
          <p className="relative max-w-[46ch] mx-auto mb-12 text-cream-deep text-[1.1rem]">
            it takes a minute to apply. we&rsquo;ll reply with what&rsquo;s
            next.
          </p>

          <div className="relative flex gap-4 justify-center flex-wrap">
            <Link
              href="/creators"
              className="group inline-flex items-center gap-2 rounded-full bg-coral text-cream px-7 py-4 text-[0.98rem] font-medium transition-all duration-200 hover:bg-coral-deep hover:-translate-y-0.5"
            >
              apply as a creator
              <span
                aria-hidden="true"
                className="transition-transform duration-200 group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
            <Link
              href="/brands"
              className="group inline-flex items-center gap-2 rounded-full border border-cream text-cream px-7 py-4 text-[0.98rem] font-medium transition-all duration-200 hover:bg-cream hover:text-ink hover:-translate-y-0.5"
            >
              apply as a brand
              <span
                aria-hidden="true"
                className="transition-transform duration-200 group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
