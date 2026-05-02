'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { Clock, Heart, ThumbsDown } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import {
  declineAfterReceipt,
  markReceived,
  markStillTrying,
} from '../_actions'

import { DeclineForm } from './decline-form'
import type { PortalMatch } from './portal-tabs'

type Mode = 'idle' | 'declining'

const STAGE_BADGES: Record<string, string> = {
  accepted: 'in transit',
  received: 'ready to evaluate',
  still_trying: 'checking back in 14 days',
  eval_submitted: 'eval received',
  eval_complete: 'eval complete',
}

export function ActiveGiftCard({ match }: { match: PortalMatch }) {
  const [mode, setMode] = useState<Mode>('idle')
  const [reasons, setReasons] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [pending, startTransition] = useTransition()

  const product = match.product
  const brand = product?.brand ?? null
  const stageLabel = STAGE_BADGES[match.stage] ?? match.stage

  function handleReceived() {
    startTransition(async () => {
      const r = await markReceived(match.id)
      if (r.ok) {
        toast.success('Marked as received.')
      } else {
        toast.error(r.error ?? 'Something went wrong.')
      }
    })
  }

  function handleStillTrying() {
    startTransition(async () => {
      const r = await markStillTrying(match.id)
      if (r.ok) {
        toast.success("Got it — we'll check back in 14 days.")
      } else {
        toast.error(r.error ?? 'Something went wrong.')
      }
    })
  }

  function handleDeclineAfterReceipt() {
    startTransition(async () => {
      const r = await declineAfterReceipt({
        matchId: match.id,
        reasons,
        note,
      })
      if (r.ok) {
        toast.success("Passed — we won't pitch this one again.")
      } else {
        toast.error(r.error ?? 'Something went wrong.')
      }
    })
  }

  return (
    <article className="bg-white border border-line/60 rounded-md overflow-hidden">
      <div className="p-5 md:p-6 flex items-start gap-5">
        {product?.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name ?? ''}
            width={120}
            height={120}
            className="size-24 md:size-28 rounded-md object-cover bg-cream-warm shrink-0"
            loading="lazy"
          />
        ) : (
          <div className="size-24 md:size-28 rounded-md bg-cream-warm shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge className="text-[0.65rem] uppercase tracking-[0.1em]">
              {stageLabel}
            </Badge>
          </div>
          <p className="text-[0.78rem] text-muted-warm">
            from {brand?.brand_name ?? 'Brand'}
          </p>
          <h3 className="font-display text-[1.25rem] tracking-tight mt-0.5">
            {product?.name ?? 'Product'}
          </h3>
        </div>
      </div>

      {match.stage === 'accepted' ? (
        <div className="border-t border-line/60 px-5 md:px-6 py-5">
          <p className="text-[0.85rem] text-ink-soft max-w-[60ch] mb-4">
            We&rsquo;ll let you know when it ships. Tap below once it lands so
            we can move you to the evaluation step.
          </p>
          <Button
            size="sm"
            variant="coral"
            disabled={pending}
            onClick={handleReceived}
          >
            {pending ? 'Saving…' : 'I received it'}
          </Button>
        </div>
      ) : null}

      {match.stage === 'received' && mode === 'idle' ? (
        <div className="border-t border-line/60 px-5 md:px-6 py-5">
          <p className="text-[0.7rem] uppercase tracking-[0.15em] text-muted-warm font-medium mb-3">
            how is it going?
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/*
              UX-INTENT: these three options are deliberately equal-weight.
              Equal sizing, equal color treatment (cream button on coral hover,
              NOT one bright primary + two muted secondary), equal hierarchy.
              The "I don't love it" path being co-equal with the positive path
              is the entire UX thesis on the creator side. Do not "promote" the
              positive path.
            */}
            <Button
              asChild
              type="button"
              variant="outline"
              size="default"
              className={cn(
                'w-full h-auto py-5 px-5 flex flex-col items-center gap-3 text-center text-[0.9rem] font-medium leading-tight rounded-md',
                'bg-white border border-line/60 text-ink hover:bg-cream-warm hover:text-ink hover:-translate-y-0',
              )}
            >
              <Link href={`/portal/creator/eval/${match.id}`}>
                <Heart aria-hidden="true" className="size-6 text-ink-soft" />
                <span>Submit eval</span>
              </Link>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="default"
              disabled={pending}
              onClick={() => setMode('declining')}
              className={cn(
                'w-full h-auto py-5 px-5 flex flex-col items-center gap-3 text-center text-[0.9rem] font-medium leading-tight rounded-md',
                'bg-white border border-line/60 text-ink hover:bg-cream-warm hover:text-ink hover:-translate-y-0',
              )}
            >
              <ThumbsDown aria-hidden="true" className="size-6 text-ink-soft" />
              <span>Not for me</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="default"
              disabled={pending}
              onClick={handleStillTrying}
              className={cn(
                'w-full h-auto py-5 px-5 flex flex-col items-center gap-3 text-center text-[0.9rem] font-medium leading-tight rounded-md',
                'bg-white border border-line/60 text-ink hover:bg-cream-warm hover:text-ink hover:-translate-y-0',
              )}
            >
              <Clock aria-hidden="true" className="size-6 text-ink-soft" />
              <span>Still trying it</span>
            </Button>
          </div>
        </div>
      ) : null}

      {match.stage === 'received' && mode === 'declining' ? (
        <div className="border-t border-line/60 px-5 md:px-6 py-5">
          <DeclineForm
            reasons={reasons}
            note={note}
            onChangeReasons={setReasons}
            onChangeNote={setNote}
          />
          <div className="mt-4 flex items-center gap-2">
            <Button
              size="sm"
              variant="coral"
              disabled={pending}
              onClick={handleDeclineAfterReceipt}
            >
              {pending ? 'Submitting…' : 'Submit decline'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                setMode('idle')
                setReasons([])
                setNote('')
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {match.stage === 'still_trying' ? (
        <div className="border-t border-line/60 px-5 md:px-6 py-5">
          <p className="text-[0.85rem] text-ink-soft leading-[1.55] max-w-[60ch]">
            No rush. We&rsquo;ll check back in 14 days. If you change your mind
            earlier, jump back in here and pick a different answer.
          </p>
        </div>
      ) : null}

      {match.stage === 'eval_submitted' ? (
        <div className="border-t border-line/60 px-5 md:px-6 py-5">
          <p className="text-[0.85rem] text-ink-soft leading-[1.55] max-w-[60ch]">
            Thanks — we got your evaluation. We&rsquo;ll be in touch with next
            steps.
          </p>
        </div>
      ) : null}

      {match.stage === 'eval_complete' ? (
        <div className="border-t border-line/60 px-5 md:px-6 py-5">
          <p className="text-[0.85rem] text-ink-soft leading-[1.55] max-w-[60ch]">
            Evaluation complete. Thanks for the honest signal.
          </p>
        </div>
      ) : null}
    </article>
  )
}
