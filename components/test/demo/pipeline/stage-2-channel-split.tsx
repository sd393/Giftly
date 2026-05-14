import { cn } from '@/lib/utils'

const LANES = [
  {
    key: 'audio',
    label: 'audio',
    sub: 'spoken-word channel',
    model: 'Whisper',
    modelSub: 'speech-to-text with timestamps',
    tone: 'sky',
  },
  {
    key: 'frames',
    label: 'frames',
    sub: 'sampled video frames',
    model: 'vLLM',
    modelSub: 'vision-language model captioning what happens on screen',
    tone: 'amber',
  },
  {
    key: 'face',
    label: 'frames (face crop)',
    sub: 'cropped to evaluator face',
    model: 'Facial analysis',
    modelSub: 'inferred emotional state per timestamp',
    tone: 'rose',
  },
] as const

const TONE_BG: Record<(typeof LANES)[number]['tone'], string> = {
  sky: 'bg-sky-100 text-sky-800 border-sky-200',
  amber: 'bg-amber-100 text-amber-800 border-amber-200',
  rose: 'bg-rose-100 text-rose-800 border-rose-200',
}

export function Stage2ChannelSplit() {
  return (
    <div className="grid md:grid-cols-[180px_40px_1fr] gap-4 md:gap-6 items-center">
      <div className="rounded-md border border-line/60 bg-cream-warm/30 p-3">
        <div className="aspect-video rounded-sm bg-ink/90 grid place-items-center font-mono text-[0.75rem] text-cream/80">
          video.mp4
        </div>
        <p className="mt-2 text-center font-mono text-[0.7rem] text-muted-warm">
          187 seconds
        </p>
      </div>

      <div className="hidden md:flex flex-col items-center justify-center gap-2 text-coral">
        <span className="text-2xl leading-none">⤳</span>
        <span className="text-2xl leading-none">→</span>
        <span className="text-2xl leading-none">⤵</span>
      </div>

      <div className="flex flex-col gap-3">
        {LANES.map((lane) => (
          <div
            key={lane.key}
            className={cn(
              'rounded-md border border-line/60 bg-white p-4 flex items-center gap-4',
              'shadow-[0_4px_12px_-10px_rgba(40,30,20,0.18)]'
            )}
          >
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded font-mono text-[0.7rem] uppercase tracking-[0.08em] border shrink-0',
                TONE_BG[lane.tone]
              )}
            >
              {lane.label}
            </span>
            <span className="text-coral text-base leading-none" aria-hidden>
              →
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[0.82rem] text-ink">{lane.model}</p>
              <p className="text-[0.75rem] text-muted-warm">{lane.modelSub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
