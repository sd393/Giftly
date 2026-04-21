import Link from 'next/link'

import { cn } from '@/lib/utils'

export type PathCardVariant = 'creator' | 'brand'

export type PathBullet = { num: string; text: string }

export function PathCard({
  variant,
  label,
  title,
  titleEm,
  bullets,
  ctaLabel,
  ctaHref,
}: {
  variant: PathCardVariant
  label: string
  title: React.ReactNode
  titleEm?: string
  bullets: PathBullet[]
  ctaLabel: string
  ctaHref: string
}) {
  const isCreator = variant === 'creator'

  return (
    <article
      className={cn(
        'relative overflow-hidden p-10 md:p-12 rounded-card min-h-[480px] flex flex-col justify-between transition-transform duration-300 hover:-translate-y-1',
        isCreator ? 'bg-coral text-cream' : 'bg-cream-deep text-ink'
      )}
    >
      <div>
        <div className="text-xs tracking-[0.2em] uppercase font-medium opacity-80 mb-8">
          {label}
        </div>
        <h3 className="font-display font-normal text-[clamp(2.25rem,3.5vw,3.25rem)] leading-[0.95] tracking-tight max-w-[12ch]">
          {title}
          {titleEm ? (
            <>
              {' '}
              <span
                className={cn(
                  'font-display italic font-light',
                  isCreator ? 'text-cream' : 'text-coral'
                )}
              >
                {titleEm}
              </span>
              .
            </>
          ) : null}
        </h3>
      </div>

      <ul className="my-8 list-none">
        {bullets.map((b, i) => (
          <li
            key={b.num}
            className={cn(
              'py-3.5 flex items-baseline gap-4 text-base border-t border-current',
              i === bullets.length - 1 && 'border-b border-current'
            )}
          >
            <span className="font-display italic opacity-60 text-[0.95rem] min-w-6 shrink-0">
              {b.num}
            </span>
            <span>{b.text}</span>
          </li>
        ))}
      </ul>

      <Link
        href={ctaHref}
        className={cn(
          'group self-start inline-flex items-center gap-2 rounded-full px-7 py-4 text-[0.98rem] font-medium transition-all duration-200 hover:-translate-y-0.5',
          isCreator
            ? 'bg-cream text-coral-deep hover:bg-ink hover:text-cream'
            : 'bg-ink text-cream hover:bg-coral'
        )}
      >
        {ctaLabel}
        <span
          aria-hidden="true"
          className="transition-transform duration-200 group-hover:translate-x-1"
        >
          →
        </span>
      </Link>
    </article>
  )
}
