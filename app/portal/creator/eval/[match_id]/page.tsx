import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { getCreatorForCurrentUser } from '@/lib/portal/auth'
import { createClient } from '@/lib/supabase/server'

import { EvalSubmitForm } from './_components/eval-submit-form'

const STAGE_BLURB: Record<string, string> = {
  proposed: "Accept this offer first — once it ships and lands you'll be able to submit your eval here.",
  accepted: "We're still waiting on shipping. Once you mark it as received, the eval will open up.",
  declined: "You passed on this one. There's nothing to evaluate.",
  declined_after_receipt: "You passed on this one. There's nothing to evaluate.",
  still_trying: "You marked this as still-trying. Switch back to 'submit eval' from the active gifts list when you're ready.",
  eval_submitted: "Thanks — we already have your eval for this product.",
  eval_complete: 'Evaluation complete. Thanks for the honest signal.',
}

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
      `id, stage, creator_id,
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

  if (match.stage !== 'received' && match.stage !== 'still_trying') {
    const blurb =
      STAGE_BLURB[match.stage] ?? "This eval isn't open right now."
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

      <div className="mt-8 border border-line/60 rounded-md bg-white p-5 md:p-6">
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
