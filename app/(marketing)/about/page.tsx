import type { Metadata } from 'next'
import Image from 'next/image'

import { Footer } from '@/components/site/footer'
import { Nav } from '@/components/site/nav'

export const metadata: Metadata = {
  title: 'about | giftly',
  description:
    'four undergrads across stanford, berkeley met, and dartmouth rebuilding how brands and creators find each other.',
}

type Member = {
  name: string
  role: string
  school: string
  bio?: string
  photo?: string
  links?: { label: string; href: string }[]
}

const TEAM: Member[] = [
  {
    name: 'Shamit D’Souza',
    role: 'co-founder',
    school: 'stanford cs',
    photo: '/team/shamit.png',
  },
  {
    name: 'Ethan Zhou',
    role: 'co-founder',
    school: 'uc berkeley met eecs + business',
    photo: '/team/ethan.png',
  },
  {
    name: 'Armaan Priyadarshan',
    role: 'co-founder',
    school: 'dartmouth math + cs',
    photo: '/team/armaan.png',
  },
  {
    name: 'Samarjit Deshmukh',
    role: 'co-founder',
    school: 'dartmouth cs',
    photo: '/team/samarjit.png',
  },
]

export default function AboutPage() {
  return (
    <>
      <Nav />

      <main id="main" className="bg-cream">
        {/* HERO */}
        <section className="relative overflow-hidden px-5 md:px-10 pt-32 md:pt-44 pb-20 md:pb-28">
          <div className="max-w-[1400px] mx-auto relative">
            <h1
              className="font-display text-[clamp(3rem,9vw,8rem)] leading-[0.92] tracking-tight max-w-[16ch] motion-safe:animate-fade-up"
              style={{ animationDelay: '0.15s' }}
            >
              matching brands with creators who&rsquo;d{' '}
              <span className="italic font-light text-coral">actually</span>
              {' '}use the product.
            </h1>

            <p
              className="mt-10 max-w-[48ch] text-[1.1rem] md:text-[1.2rem] text-ink-soft leading-[1.6] motion-safe:animate-fade-up"
              style={{ animationDelay: '0.3s' }}
            >
              giftly matches dtc brands with creators who actually use the
              product. commission-only, no posting quotas. every honest match
              is data for the ai agents that will soon do the buying.
            </p>

            <span
              aria-hidden="true"
              className="hidden md:block absolute top-2 right-2 font-display italic text-coral text-6xl motion-safe:animate-fade-in"
              style={{ animationDelay: '0.5s' }}
            >
              ✶
            </span>
            <span
              aria-hidden="true"
              className="hidden md:block absolute bottom-10 right-40 font-display italic text-coral-pale text-3xl motion-safe:animate-fade-in"
              style={{ animationDelay: '0.7s' }}
            >
              ✶
            </span>
          </div>
        </section>

        {/* THESIS */}
        <section className="bg-cream-warm py-20 md:py-32 px-5 md:px-10">
          <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-[1fr_1.3fr] gap-12 md:gap-24 items-start">
            <div>
              <span className="text-xs tracking-[0.18em] uppercase text-muted-warm font-medium">
                the thesis
              </span>
              <h2 className="mt-6 font-display text-[clamp(2rem,4vw,3.25rem)] leading-[1] tracking-tight">
                match on{' '}
                <span className="italic font-light text-coral">fit</span>.
                pay on results.
              </h2>
              <p className="mt-6 text-ink-soft text-[1.05rem] leading-[1.65]">
                we match dtc brands with creators who&rsquo;d actually use
                the product. creators keep what we send, post only if they
                love it, and earn on every sale their link drives.
              </p>
              <p className="mt-4 text-ink-soft text-[1.05rem] leading-[1.65]">
                underneath the matching sits an honest dataset of what
                people actually buy and keep — the substrate agent-to-agent
                commerce will need once ai is placing the orders.
              </p>
            </div>

            <blockquote className="font-display font-light text-[clamp(1.5rem,2.6vw,2.5rem)] leading-[1.2] tracking-[-0.01em] text-ink relative pl-8 md:pl-10">
              <span
                aria-hidden="true"
                className="absolute left-0 top-[0.4em] w-1 h-[calc(100%-0.8em)] bg-coral"
              />
              an agent buying on{' '}
              <em className="not-italic italic font-display text-coral-deep">
                corrupted signal
              </em>{' '}
              is worse than no agent at all.
            </blockquote>
          </div>
        </section>

        {/* TEAM */}
        <section className="py-20 md:py-32 px-5 md:px-10">
          <div className="max-w-[1400px] mx-auto">
            <div className="flex flex-wrap items-end justify-between gap-6 mb-14 md:mb-20">
              <div>
                <span className="text-xs tracking-[0.18em] uppercase text-muted-warm font-medium">
                  team
                </span>
                <h2 className="mt-4 font-display text-[clamp(2rem,4.5vw,3.5rem)] leading-[0.95] tracking-tight">
                  who&rsquo;s on the{' '}
                  <span className="italic font-light text-coral">inside</span>.
                </h2>
              </div>
              <p className="max-w-[38ch] text-ink-soft text-[1rem] leading-[1.55]">
                four undergrads building the clean-signal layer under
                agent-mediated commerce. three schools, one bet.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {TEAM.map((m, i) => (
                <TeamCard key={m.name} member={m} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section className="bg-cream-warm py-24 md:py-36 px-5 md:px-10">
          <div className="max-w-[1400px] mx-auto text-center">
            <span className="text-xs tracking-[0.18em] uppercase text-muted-warm font-medium">
              open door
            </span>
            <p className="mt-8 font-display text-[clamp(1.75rem,4.5vw,3.5rem)] leading-[1.15] tracking-tight max-w-[28ch] mx-auto">
              got a brand, a pitch, a cold take? send it.
            </p>
            <a
              href="mailto:team@trygiftly.com"
              className="mt-10 inline-block font-display italic font-light text-[clamp(1.5rem,3.5vw,2.75rem)] text-coral underline decoration-1 underline-offset-8 hover:text-coral-deep hover:decoration-2 transition-all duration-300"
            >
              team@trygiftly.com
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}

function TeamCard({ member, index }: { member: Member; index: number }) {
  return (
    <article
      className="group relative bg-white/90 backdrop-blur-xl p-6 md:p-7 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_-20px_rgba(42,26,18,0.25)] motion-safe:animate-fade-up"
      style={{ animationDelay: `${0.1 + index * 0.12}s` }}
    >
      <span
        aria-hidden="true"
        className="absolute -top-1 left-1/2 -translate-x-1/2 font-display italic text-coral/60 text-xl transition-all duration-300 group-hover:text-coral group-hover:rotate-12"
      >
        ✶
      </span>

      <div className="relative aspect-square w-full bg-cream-deep overflow-hidden mb-5 transition-colors duration-300 group-hover:bg-coral-pale">
        {member.photo ? (
          <Image
            src={member.photo}
            alt={member.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-warm text-xs tracking-[0.2em] uppercase transition-colors duration-300 group-hover:text-coral-deep">
            photo
          </div>
        )}
      </div>

      <h3 className="font-display text-[1.35rem] leading-[1.1] tracking-tight">
        {member.name}
      </h3>
      <p className="mt-1 text-[0.9rem] text-ink-soft">{member.role}</p>
      <p className="mt-0.5 text-[0.85rem] text-muted-warm">{member.school}</p>

      {member.bio ? (
        <p className="mt-4 text-[0.95rem] leading-[1.55] text-ink-soft">
          {member.bio}
        </p>
      ) : null}

      {member.links && member.links.length > 0 ? (
        <ul className="mt-5 flex flex-wrap gap-4 text-[0.85rem]">
          {member.links.map((l) => (
            <li key={l.label}>
              <a
                href={l.href}
                className="text-coral hover:text-coral-deep underline decoration-1 underline-offset-4 transition-colors"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  )
}
