'use client'

import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'

import { StageFrame } from './stage-frame'
import { STAGES } from './stages'

const AUTOPLAY_MS = 3500

export default function PipelinePage() {
  const [stageIdx, setStageIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  // Auto-advance while playing; stop on the last stage.
  useEffect(() => {
    if (!isPlaying) return
    if (stageIdx >= STAGES.length - 1) {
      setIsPlaying(false)
      return
    }
    const t = setTimeout(() => setStageIdx((i) => i + 1), AUTOPLAY_MS)
    return () => clearTimeout(t)
  }, [isPlaying, stageIdx])

  const stage = STAGES[stageIdx]
  const StageBody = stage.Component
  const atStart = stageIdx === 0
  const atEnd = stageIdx === STAGES.length - 1

  return (
    <div className="min-h-screen bg-cream text-ink">
      <main className="max-w-[1280px] mx-auto px-6 md:px-10 py-10 pb-28">
        <header className="mb-6">
          <p className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-warm font-medium">
            pipeline
          </p>
          <h1 className="mt-1 font-display text-[1.85rem] md:text-[2.25rem] tracking-tight leading-[1.05]">
            From two minutes of video to a{' '}
            <span className="font-display italic font-light text-coral">
              comparable score
            </span>
          </h1>
          <p className="mt-1.5 text-[0.85rem] text-muted-warm max-w-[64ch]">
            Five stages, traced through one creator&rsquo;s evaluation
            (Samantha Lee, Bime Beauty Heated Curler). Use prev / play / next
            to walk through each step.
          </p>
        </header>

        <StageFrame
          stageIdx={stageIdx}
          totalStages={STAGES.length}
          title={stage.title}
          subtitle={stage.subtitle}
        >
          <StageBody />
        </StageFrame>

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => setStageIdx((i) => Math.max(0, i - 1))}
            disabled={atStart}
          >
            ◀ prev
          </Button>
          <Button
            onClick={() => setIsPlaying((p) => !p)}
            disabled={atEnd && !isPlaying}
            className="bg-coral hover:bg-coral/90 text-cream"
          >
            {isPlaying ? '❚❚ pause' : atEnd ? '▶ play' : '▶ play through'}
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              setStageIdx((i) => Math.min(STAGES.length - 1, i + 1))
            }
            disabled={atEnd}
          >
            next ▶
          </Button>
        </div>
      </main>
    </div>
  )
}
