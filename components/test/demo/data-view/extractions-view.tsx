'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { cn } from '@/lib/utils'

import { HERO_VIDEO_ID, PER_VIDEO_EXTRACTIONS } from '../lib/mock-data'
import { ScoreChip } from '../lib/score-chip'
import type {
  ExtractedAttribute,
  PerVideoExtraction,
  RecordVerdict,
} from '../lib/types'

export function ExtractionsView() {
  return (
    <div>
      <p className="mb-4 max-w-[64ch] text-[0.85rem] text-muted-warm">
        Per-video output of the stage-4 LLM — open-vocabulary attributes with
        evidence anchored to timestamps in the source video. The hero record
        carries full transcript / visual / facial citations; the rest are
        extraction-only.
      </p>

      <Accordion type="multiple" className="space-y-2">
        {PER_VIDEO_EXTRACTIONS.map((extraction) => (
          <ExtractionItem key={extraction.record_id} extraction={extraction} />
        ))}
      </Accordion>
    </div>
  )
}

function ExtractionItem({ extraction }: { extraction: PerVideoExtraction }) {
  const isHero = extraction.record_id === HERO_VIDEO_ID
  return (
    <AccordionItem
      value={extraction.record_id}
      className="rounded-md border border-line/60 bg-white px-4"
    >
      <AccordionTrigger className="py-3 text-[0.85rem] font-medium hover:no-underline">
        <div className="flex flex-1 items-center justify-between gap-4 pr-2">
          <div className="flex items-baseline gap-3 min-w-0">
            <span className="font-mono text-[0.78rem] text-muted-warm shrink-0">
              {extraction.record_id}
            </span>
            <VerdictPill verdict={extraction.verdict} />
            <BrandBadge brand={extraction.brand} />
            <span className="hidden lg:inline font-mono text-[0.78rem] text-ink-soft truncate">
              {extraction.creator_id}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[0.72rem] tabular-nums text-muted-warm shrink-0">
            {isHero ? (
              <span className="inline-flex items-center rounded-sm border border-coral/40 bg-coral/5 px-1.5 py-0.5 text-coral font-mono uppercase tracking-[0.08em] text-[0.65rem]">
                hero
              </span>
            ) : null}
            <span className="font-mono">
              {extraction.attributes.length} attrs
            </span>
          </div>
        </div>
      </AccordionTrigger>

      <AccordionContent className="pt-0 pb-4">
        {isHero ? (
          <div className="mb-3 rounded-md border border-line/60 bg-cream-warm/30 px-3 py-2 flex flex-wrap gap-3 text-[0.78rem]">
            <span className="font-mono uppercase tracking-[0.12em] text-muted-warm text-[0.66rem]">
              inputs
            </span>
            <span>{extraction.transcript.length} transcript lines</span>
            <span className="text-muted-warm">·</span>
            <span>{extraction.visual_observations.length} visual obs</span>
            <span className="text-muted-warm">·</span>
            <span>{extraction.facial_cues.length} facial cues</span>
          </div>
        ) : (
          <div className="mb-3 inline-flex items-center gap-2 rounded-sm border border-line/60 bg-cream-warm/30 px-2 py-1 font-mono text-[0.7rem] uppercase tracking-[0.08em] text-muted-warm">
            extraction-only view · raw streams omitted
          </div>
        )}

        <ul className="space-y-2">
          {extraction.attributes.map((attr) => (
            <AttributeRow key={attr.canonical_name} attr={attr} />
          ))}
        </ul>
      </AccordionContent>
    </AccordionItem>
  )
}

function AttributeRow({ attr }: { attr: ExtractedAttribute }) {
  const hasEvidence =
    attr.evidence.transcript ||
    attr.evidence.visual ||
    attr.evidence.facial
  return (
    <li className="rounded-md border border-line/40 bg-cream-warm/20 px-3 py-2">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[0.78rem] text-ink truncate">
            {attr.canonical_name}
          </p>
          <p className="text-[0.78rem] text-muted-warm">{attr.display_label}</p>
        </div>
        <ScoreChip score={attr.score_1_to_5} />
      </div>
      {hasEvidence ? (
        <div className="mt-1.5 space-y-1 text-[0.78rem]">
          {attr.evidence.transcript ? (
            <EvidenceRow
              tone="sky"
              ts={attr.evidence.transcript.ts}
              text={`“${attr.evidence.transcript.quote}”`}
            />
          ) : null}
          {attr.evidence.visual ? (
            <EvidenceRow
              tone="amber"
              ts={attr.evidence.visual.ts}
              text={attr.evidence.visual.quote}
            />
          ) : null}
          {attr.evidence.facial ? (
            <EvidenceRow
              tone="rose"
              ts={attr.evidence.facial.ts}
              text={`face: ${attr.evidence.facial.cue.replace(/_/g, ' ')}`}
            />
          ) : null}
        </div>
      ) : null}
    </li>
  )
}

function EvidenceRow({
  tone,
  ts,
  text,
}: {
  tone: 'sky' | 'amber' | 'rose'
  ts: string
  text: string
}) {
  const tsTone =
    tone === 'sky'
      ? 'text-sky-700'
      : tone === 'amber'
        ? 'text-amber-700'
        : 'text-rose-700'
  return (
    <div className="flex gap-2">
      <span className={cn('font-mono text-[0.72rem] shrink-0', tsTone)}>
        {ts}
      </span>
      <span className="text-ink-soft">{text}</span>
    </div>
  )
}

function VerdictPill({ verdict }: { verdict: RecordVerdict }) {
  const tone =
    verdict === 'positive'
      ? 'text-emerald-700 border-emerald-300 bg-emerald-50'
      : 'text-rose-700 border-rose-300 bg-rose-50'
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded border text-[0.7rem] font-mono uppercase tracking-[0.08em]',
        tone
      )}
    >
      {verdict}
    </span>
  )
}

function BrandBadge({ brand }: { brand: string }) {
  const tone =
    brand === 'Bime Beauty'
      ? 'text-coral border-coral/40 bg-coral/5'
      : 'text-ink-soft border-line/60 bg-cream-warm/50'
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded border text-[0.7rem] font-mono',
        tone
      )}
    >
      {brand}
    </span>
  )
}
