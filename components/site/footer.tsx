import Link from 'next/link'

import { Logo } from '@/components/site/logo'

export function Footer() {
  return (
    <footer className="px-5 md:px-10 pt-12 md:pt-16 pb-8 md:pb-10 bg-cream">
      <div className="mx-auto max-w-[1400px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-8 md:gap-12 mb-12">
          <div>
            <Link href="/" aria-label="giftly home">
              <Logo size="xl" color="coral" className="mb-4" />
            </Link>
            <p className="text-muted-warm max-w-[32ch] text-[0.95rem]">
              creator–brand matching for the ai era. built by students
              at stanford, berkeley met, and dartmouth.
            </p>
          </div>

          <FooterCol
            heading="platform"
            links={[
              { href: '/creators', label: 'for creators' },
              { href: '/brands', label: 'for brands' },
              { href: '/about', label: 'about' },
              { href: 'https://app.trygiftly.com', label: 'log in' },
            ]}
          />

          <FooterCol
            heading="resources"
            links={[
              { href: '/#how-it-works', label: 'how it works' },
              { href: '/creators#faq', label: 'faq' },
              { href: 'mailto:team@trygiftly.com', label: 'contact' },
            ]}
          />

          <FooterCol
            heading="follow"
            links={[
              { href: 'https://instagram.com', label: 'instagram' },
              { href: 'https://tiktok.com', label: 'tiktok' },
              { href: 'https://linkedin.com', label: 'linkedin' },
            ]}
          />
        </div>

        <div className="pt-8 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-warm">
          <span>
            © {new Date().getFullYear()} giftly. made with{' '}
            <span className="font-display italic">care</span> in california +
            new hampshire.
          </span>
          <span>trygiftly.com</span>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({
  heading,
  links,
}: {
  heading: string
  links: { href: string; label: string }[]
}) {
  return (
    <div>
      <h4 className="font-sans text-xs uppercase tracking-[0.18em] text-muted-warm mb-5 font-medium">
        {heading}
      </h4>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.label}>
            <Link
              href={l.href}
              className="text-ink hover:text-coral transition-colors text-[0.95rem]"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
