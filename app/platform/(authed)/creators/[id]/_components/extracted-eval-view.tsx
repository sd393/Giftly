import type { ExtractedEval } from '@/lib/schemas/eval'

export function ExtractedEvalView({ data }: { data: ExtractedEval }) {
  return (
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
      <dt className="text-muted-warm">raw quotes</dt>
      <dd>
        <ul className="list-disc pl-4">
          {data.raw_quotes.map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ul>
      </dd>
    </dl>
  )
}
