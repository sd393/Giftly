import { ShieldCheck } from 'lucide-react'

// UX-INTENT: this banner is deliberately the loudest element on the offer
// card. Coral fill + cream text + display serif at headline weight, sitting
// above the product info. Equal-weight no-strings messaging is the entire
// trust thesis on the creator side; do not demote into a footer or muted
// disclaimer treatment.
export function NoObligationBanner() {
  return (
    <div className="bg-coral text-cream px-5 py-4 md:px-6 md:py-5 flex items-start gap-3">
      <ShieldCheck
        aria-hidden="true"
        className="size-5 shrink-0 mt-0.5 text-cream"
      />
      <div className="min-w-0">
        <p className="font-display text-[1.05rem] md:text-[1.15rem] leading-[1.25] tracking-tight">
          <span className="font-medium">No obligation.</span>{' '}
          <span className="font-light italic">
            If you receive this and don&rsquo;t love it, just tell us why
          </span>{' '}
          — that&rsquo;s worth as much to us as a post.
        </p>
      </div>
    </div>
  )
}
