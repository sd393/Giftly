import Image from 'next/image'

import {
  HERO_TRANSCRIPT,
  HERO_VIDEO_ID,
  HERO_VISUAL_OBS,
} from '../lib/mock-data'

export function Stage1RawCapture() {
  const durationSec = Math.max(
    HERO_TRANSCRIPT[HERO_TRANSCRIPT.length - 1]?.ts_seconds ?? 0,
    HERO_VISUAL_OBS[HERO_VISUAL_OBS.length - 1]?.ts_seconds ?? 0
  )
  const mins = Math.floor(durationSec / 60)
  const secs = String(durationSec % 60).padStart(2, '0')

  return (
    <div className="grid md:grid-cols-[1fr_1.2fr] gap-6 md:gap-10 items-center">
      <div className="rounded-md border border-line/60 bg-cream-warm/30 p-4">
        <div className="relative aspect-video overflow-hidden rounded-md bg-ink/90">
          <Image
            src="/demo/heated-eyelash-curler.png"
            alt="Hero video thumbnail"
            fill
            className="object-contain p-6"
          />
          <span className="absolute bottom-2 right-2 rounded-sm bg-ink/80 px-1.5 py-0.5 font-mono text-[0.7rem] text-cream">
            {mins}:{secs}
          </span>
          <span className="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-sm bg-rose-600/90 px-1.5 py-0.5 font-mono text-[0.65rem] uppercase tracking-[0.1em] text-cream">
            <span className="inline-block size-1.5 rounded-full bg-cream" />
            recorded
          </span>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-y-2 text-[0.78rem]">
          <dt className="text-muted-warm">filename</dt>
          <dd className="font-mono text-ink-soft text-right">{HERO_VIDEO_ID}.mp4</dd>
          <dt className="text-muted-warm">creator</dt>
          <dd className="text-ink-soft text-right">@lashlifedaily</dd>
          <dt className="text-muted-warm">recorded</dt>
          <dd className="text-ink-soft text-right">2026-04-12</dd>
          <dt className="text-muted-warm">duration</dt>
          <dd className="font-mono text-ink-soft text-right">
            {mins}:{secs}
          </dd>
        </dl>
      </div>

      <div>
        <p className="font-display text-[1.15rem] md:text-[1.3rem] leading-[1.45] text-ink">
          Two minutes of someone using a product, on camera, in their own
          space.
        </p>
        <p className="mt-3 text-[0.9rem] leading-[1.55] text-muted-warm max-w-[44ch]">
          One file, two channels — what they said (audio) and what they did
          and looked like (video). Everything downstream is built on top of
          this one file.
        </p>
        <div className="mt-5 rounded-sm border-l-2 border-coral pl-4 py-1">
          <p className="text-[0.7rem] uppercase tracking-[0.15em] text-muted-warm font-medium">
            input
          </p>
          <p className="mt-0.5 font-mono text-[0.85rem] text-ink">
            1 × video.mp4
          </p>
        </div>
      </div>
    </div>
  )
}
