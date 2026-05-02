import { Badge } from '@/components/ui/badge'
import {
  ExtractedEvalSchema,
  type ExtractedEval,
} from '@/lib/schemas/eval'
import { createClient } from '@/lib/supabase/server'

import { ExtractedEvalView } from './extracted-eval-view'
import { RunExtractionButton } from './run-extraction-button'

type EvalVideo = {
  id: string
  blob_key: string
  transcript_status: string
  transcript_error: string | null
  extraction_status: string
  extraction_error: string | null
  extracted: unknown
  created_at: string
}

type MatchRow = {
  id: string
  stage: string
  proposed_at: string
  product:
    | {
        id: string
        name: string
        brand: { id: string; brand_name: string } | null
      }
    | null
  // latest eval video, if any (sorted desc, sliced to 1 in render)
  eval_videos: EvalVideo[] | null
}

const STAGE_VARIANT: Record<
  string,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  proposed: 'secondary',
  accepted: 'default',
  received: 'default',
  still_trying: 'outline',
  declined: 'outline',
  declined_after_receipt: 'outline',
  eval_submitted: 'default',
  eval_complete: 'default',
}

const STAGE_LABEL: Record<string, string> = {
  proposed: 'proposed',
  accepted: 'accepted',
  received: 'received',
  still_trying: 'still trying',
  declined: 'declined',
  declined_after_receipt: 'declined after receipt',
  eval_submitted: 'eval submitted',
  eval_complete: 'eval complete',
}

export async function MatchesList({ creatorId }: { creatorId: string }) {
  const supabase = await createClient()

  const { data: matches, error } = await supabase
    .from('matches')
    .select(
      `
      id,
      stage,
      proposed_at,
      product:products (
        id,
        name,
        brand:brands ( id, brand_name )
      ),
      eval_videos (
        id,
        blob_key,
        transcript_status,
        transcript_error,
        extraction_status,
        extraction_error,
        extracted,
        created_at
      )
    `,
    )
    .eq('creator_id', creatorId)
    .order('proposed_at', { ascending: false })

  if (error) {
    return (
      <p className="text-[0.85rem] text-coral-deep">
        Failed to load matches: {error.message}
      </p>
    )
  }
  if (!matches || matches.length === 0) {
    return (
      <p className="text-[0.85rem] text-muted-warm">
        No matches yet for this creator.
      </p>
    )
  }

  // For each match, pick the latest eval_videos row (if any) and pre-sign
  // its blob_key so we can render a 1-hour download link inline.
  const rows = await Promise.all(
    (matches as unknown as MatchRow[]).map(async (m) => {
      const latestEval = (m.eval_videos ?? []).slice().sort((a, b) =>
        a.created_at < b.created_at ? 1 : -1,
      )[0]
      let videoUrl: string | null = null
      if (latestEval?.blob_key) {
        const { data: signed } = await supabase.storage
          .from('eval-videos')
          .createSignedUrl(latestEval.blob_key, 3600)
        videoUrl = signed?.signedUrl ?? null
      }

      // Validate the extracted JSON shape before handing it to the view.
      // Stale rows (older schema, missing keys) just render as "raw JSON
      // unavailable" rather than crashing the page.
      let extracted: ExtractedEval | null = null
      if (latestEval?.extracted) {
        const parsed = ExtractedEvalSchema.safeParse(latestEval.extracted)
        if (parsed.success) extracted = parsed.data
      }

      return { match: m, latestEval: latestEval ?? null, videoUrl, extracted }
    }),
  )

  return (
    <ul className="space-y-4">
      {rows.map(({ match, latestEval, videoUrl, extracted }) => {
        const product = match.product
        const brand = product?.brand ?? null
        const stageVariant = STAGE_VARIANT[match.stage] ?? 'outline'
        const stageLabel = STAGE_LABEL[match.stage] ?? match.stage

        const extractionFailed =
          latestEval?.extraction_status === 'failed' ||
          latestEval?.transcript_status === 'failed'
        const extractionError =
          latestEval?.extraction_error ?? latestEval?.transcript_error ?? null

        return (
          <li
            key={match.id}
            className="bg-white border border-line/60 rounded-md p-5"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    variant={stageVariant}
                    className="text-[0.65rem] uppercase tracking-[0.1em]"
                  >
                    {stageLabel}
                  </Badge>
                </div>
                <p className="text-[0.78rem] text-muted-warm">
                  from {brand?.brand_name ?? '—'}
                </p>
                <h3 className="font-display text-[1.05rem] tracking-tight mt-0.5">
                  {product?.name ?? 'Product'}
                </h3>
              </div>
              {videoUrl ? (
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[0.8rem] underline text-ink-soft hover:text-ink"
                >
                  view video
                </a>
              ) : null}
            </div>

            {match.stage === 'eval_submitted' && !extractionFailed ? (
              <div className="mt-3">
                <RunExtractionButton matchId={match.id} />
              </div>
            ) : null}

            {extractionFailed ? (
              <div className="mt-3 space-y-2">
                <p className="text-[0.8rem] text-coral-deep">
                  extraction failed
                  {extractionError ? `: ${extractionError}` : ''}
                </p>
                <RunExtractionButton matchId={match.id} label="retry" />
              </div>
            ) : null}

            {match.stage === 'eval_complete' && extracted ? (
              <div className="mt-4 border-t border-line/60 pt-4">
                <ExtractedEvalView data={extracted} />
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
