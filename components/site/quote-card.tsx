import { cn } from '@/lib/utils'

export type QuoteVariant = 'default' | 'coral'

export function QuoteCard({
  variant = 'default',
  body,
  attrName,
  attrDetail,
}: {
  variant?: QuoteVariant
  body: string
  attrName: string
  attrDetail: string
}) {
  const isCoral = variant === 'coral'

  return (
    <article
      className={cn(
        'p-8 md:p-9 rounded-card-sm border min-h-[280px] flex flex-col transition-all duration-300 hover:-translate-y-1',
        isCoral
          ? 'bg-coral border-coral text-cream hover:bg-coral-deep'
          : 'bg-cream-warm border-line hover:bg-peach'
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          'font-display text-5xl leading-[0.5] mb-4',
          isCoral ? 'text-cream' : 'text-coral'
        )}
      >
        &ldquo;
      </div>
      <p className="font-display text-[1.15rem] leading-[1.5] mb-auto tracking-[-0.005em]">
        {body}
      </p>
      <div className="mt-6 pt-5 border-t border-current opacity-90">
        <strong className="block font-medium text-[0.95rem] mb-0.5">
          {attrName}
        </strong>
        <span className="text-[0.85rem] opacity-75">{attrDetail}</span>
      </div>
    </article>
  )
}
