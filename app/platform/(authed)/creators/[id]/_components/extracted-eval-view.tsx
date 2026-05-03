import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import type { ExtractedEval } from '@/lib/schemas/eval'

export function ExtractedEvalView({ data }: { data: ExtractedEval }) {
  // Anti-fraud heuristic: low/none confidence OR explicit "not visible" =
  // surface a coral warning so a human reviewer can spot-check before
  // payout. `null` (model couldn't tell) doesn't trigger the flag — it's
  // a legitimate inconclusive signal, not a red flag.
  const productFlag =
    data.product_visible_in_video === false ||
    data.product_match_confidence === 'low' ||
    data.product_match_confidence === 'none'

  return (
    <div className="space-y-4">
      {data.transcript ? (
        <Collapsible>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[0.85rem] text-muted-warm">transcript</span>
            <CollapsibleTrigger className="text-[0.75rem] underline text-ink-soft hover:text-ink data-[state=open]:hidden">
              show
            </CollapsibleTrigger>
            <CollapsibleTrigger className="text-[0.75rem] underline text-ink-soft hover:text-ink data-[state=closed]:hidden">
              hide
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <p className="text-[0.85rem] mt-2 whitespace-pre-wrap text-ink-soft">
              {data.transcript}
            </p>
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      {data.visual_observations.length > 0 ? (
        <div>
          <p className="text-[0.85rem] text-muted-warm mb-1">
            visual observations
          </p>
          <ul className="list-disc pl-4 text-[0.85rem] space-y-0.5">
            {data.visual_observations.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.demonstrated_use_cases.length > 0 ? (
        <div>
          <p className="text-[0.85rem] text-muted-warm mb-1">
            demonstrated use cases
          </p>
          <ul className="list-disc pl-4 text-[0.85rem] space-y-0.5">
            {data.demonstrated_use_cases.map((u, i) => (
              <li key={i}>{u}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <dl className="grid grid-cols-2 gap-y-3 text-[0.85rem]">
        <dt className="text-muted-warm">would keep using</dt>
        <dd>{data.would_keep_using ?? '—'}</dd>
        <dt className="text-muted-warm">worth the price</dt>
        <dd>{data.worth_the_price ?? '—'}</dd>
        <dt className="text-muted-warm">best for</dt>
        <dd>{data.best_for.join(', ') || '—'}</dd>
        <dt className="text-muted-warm">not for</dt>
        <dd>{data.not_for.join(', ') || '—'}</dd>
        <dt className="text-muted-warm">one-line take</dt>
        <dd className="italic">{data.one_line_take ?? '—'}</dd>
        <dt className="text-muted-warm">sentiment</dt>
        <dd>{data.sentiment ?? '—'}</dd>
        <dt className="text-muted-warm">product visible</dt>
        <dd>
          {data.product_visible_in_video === null
            ? '—'
            : data.product_visible_in_video
              ? 'yes'
              : 'no'}
        </dd>
        <dt className="text-muted-warm">match confidence</dt>
        <dd className="flex flex-wrap items-center gap-2">
          <span>{data.product_match_confidence ?? '—'}</span>
          {productFlag ? (
            <span className="inline-flex items-center rounded-md border border-coral/40 bg-coral/10 px-2 py-0.5 text-[0.7rem] font-medium text-coral-deep">
              flag: product not clearly verified
            </span>
          ) : null}
        </dd>
        <dt className="text-muted-warm">raw quotes</dt>
        <dd>
          <ul className="list-disc pl-4">
            {data.raw_quotes.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </dd>
      </dl>
    </div>
  )
}
