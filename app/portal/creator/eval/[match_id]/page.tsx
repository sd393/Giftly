import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { getCreatorForCurrentUser } from '@/lib/portal/auth'
import { daysLeft, isPastDeadline } from '@/lib/portal/eval-deadline'
import { createClient } from '@/lib/supabase/server'

import { EvalSubmitForm } from './_components/eval-submit-form'

// Used for both off-stage rows and past-deadline rows. The `expired` blurb
// is the generic catch-all for any reason the window is shut — eval_expired
// stage flipped by cron OR a `received`/`still_trying` row whose deadline
// silently lapsed before cron ran.
const STAGE_BLURB: Record<string, string> = {
  proposed: "Accept this offer first — once it ships and lands you'll be able to submit your eval here.",
  accepted: "We're still waiting on shipping. Once you mark it as received, the eval will open up.",
  declined: "You passed on this one. There's nothing to evaluate.",
  declined_after_receipt: "You passed on this one. There's nothing to evaluate.",
  still_trying: "You marked this as still-trying. Switch back to 'submit eval' from the active gifts list when you're ready.",
  eval_submitted: "Thanks — we already have your eval for this product.",
  eval_complete: 'Evaluation complete. Thanks for the honest signal.',
  eval_expired:
    "The 7-day submission window for this eval has closed. Reach out to your Giftly contact if you'd like a re-entry.",
}

const PAST_DEADLINE_BLURB =
  "The 7-day submission window for this eval has closed. Reach out to your Giftly contact if you'd like a re-entry."

export default async function EvalSubmitPage({
  params,
}: {
  params: Promise<{ match_id: string }>
}) {
  const { match_id: matchId } = await params

  const creator = await getCreatorForCurrentUser()
  if (!creator) redirect('/login')

  const supabase = await createClient()
  const { data: match } = await supabase
    .from('matches')
    .select(
      `id, stage, creator_id, eval_deadline_at,
       product:products(id, name, image_url,
                        brand:brands(id, brand_name))`,
    )
    .eq('id', matchId)
    .eq('creator_id', creator.id)
    .single()

  if (!match) notFound()

  const product = Array.isArray(match.product) ? match.product[0] : match.product
  const brand = product
    ? Array.isArray(product.brand)
      ? product.brand[0]
      : product.brand
    : null

  // Two ways the form is closed: stage isn't open OR deadline has lapsed
  // even though stage hasn't been flipped to `eval_expired` yet (cron gap).
  const stageClosed =
    match.stage !== 'received' && match.stage !== 'still_trying'
  const deadlineClosed = isPastDeadline(match.eval_deadline_at)

  if (stageClosed || deadlineClosed) {
    const blurb = stageClosed
      ? STAGE_BLURB[match.stage] ?? "This eval isn't open right now."
      : PAST_DEADLINE_BLURB
    return (
      <div className="max-w-[640px]">
        <p className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-warm font-medium">
          eval submission
        </p>
        <h1 className="font-display text-[1.75rem] tracking-tight mt-1">
          {product?.name ?? 'this product'}
        </h1>
        <p className="text-[0.85rem] text-muted-warm mt-1">
          from {brand?.brand_name ?? 'Brand'}
        </p>
        <div className="mt-8 border border-line/60 rounded-md bg-white p-5">
          <p className="text-[0.7rem] uppercase tracking-[0.15em] text-muted-warm font-medium mb-2">
            this eval isn&rsquo;t open
          </p>
          <p className="text-[0.95rem] text-ink leading-[1.55]">{blurb}</p>
          <div className="mt-5">
            <Button asChild variant="outline" size="sm">
              <Link href="/portal/creator">Back to portal</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // In-window: build the deadline subtitle near the rules card so the
  // creator sees both the deadline date and the rolling day count.
  const deadlineLeft = daysLeft(match.eval_deadline_at)
  const deadlineDate = match.eval_deadline_at
    ? new Date(match.eval_deadline_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <div className="max-w-[640px]">
      <p className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-warm font-medium">
        eval submission
      </p>
      <h1 className="font-display text-[1.75rem] tracking-tight mt-1">
        Record your eval
      </h1>
      <p className="text-[0.85rem] text-muted-warm mt-1">
        {product?.name ?? 'this product'} from {brand?.brand_name ?? 'Brand'}
      </p>

      {/* Deadline subtitle. Sits between the title and rules card so the
          creator sees the window before reading the rules. Hidden for
          legacy rows without an `eval_deadline_at`. */}
      {deadlineDate && deadlineLeft != null ? (
        <p className="mt-3 text-[0.78rem] text-muted-warm">
          Submit by {deadlineDate} — about {deadlineLeft} day
          {deadlineLeft === 1 ? '' : 's'} left.
        </p>
      ) : null}

      {/*
        Rules card. Visually distinct from the talking-points card below so
        the two real rules (show the product on camera, pick honest sentiment)
        don't get conflated with the optional inspiration bullets. Phrased
        before recording so the creator doesn't waste a take.
      */}
      <div className="mt-8 bg-cream-warm/40 border border-line/60 rounded-md p-4">
        <p className="text-[0.7rem] uppercase tracking-[0.15em] text-muted-warm font-medium mb-2">
          two rules
        </p>
        <ol className="text-[0.9rem] text-ink leading-[1.55] list-decimal pl-5 space-y-2">
          <li>
            Show the product in the video. (Hold it up, point to it, demo it
            — anything that confirms you actually have it.)
          </li>
          <li>
            Pick positive or negative below — be honest. We&rsquo;d rather
            have a real &ldquo;this didn&rsquo;t work for me&rdquo; than a
            forced thumbs-up.
          </li>
        </ol>
      </div>

      <div className="mt-6 border border-line/60 rounded-md bg-white p-5 md:p-6">
        <p className="text-[0.7rem] uppercase tracking-[0.15em] text-muted-warm font-medium mb-2">
          how this works
        </p>
        <p className="text-[0.95rem] text-ink leading-[1.6]">
          Record yourself talking about the product for as long as you want.
          Free-form, off-the-cuff is fine — better, even. We&rsquo;ll pull the
          honest signal out on our end.
        </p>

        <div className="mt-5">
          <p className="text-[0.7rem] uppercase tracking-[0.15em] text-muted-warm font-medium mb-2">
            things you might cover (optional, just inspiration)
          </p>
          <ul className="text-[0.9rem] text-ink-soft leading-[1.6] list-disc pl-5 space-y-1">
            <li>worth the price?</li>
            <li>who&rsquo;s this for?</li>
            <li>anything you didn&rsquo;t expect?</li>
            <li>your one-line verdict</li>
          </ul>
        </div>
      </div>

      <div className="mt-6">
        <EvalSubmitForm matchId={match.id} />
      </div>

      <div className="mt-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/portal/creator">Cancel</Link>
        </Button>
      </div>
    </div>
  )
}
