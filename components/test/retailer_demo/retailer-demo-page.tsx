'use client'

import { Sparkles } from 'lucide-react'
import { useState } from 'react'

import { useStream } from './lib/use-stream'
import { QueryPill } from './query-pill'
import { ResponsePane } from './response-pane'
import styles from './styles.module.css'

const SUGGESTIONS = [
  'best for color-treated hair',
  'sensitive scalp option',
  'value for money',
  'most-trusted by haircare creators',
]

export function RetailerDemoPage() {
  const [submitted, setSubmitted] = useState<string | null>(null)
  const baseline = useStream()
  const signal = useStream()

  function submit(q: string) {
    setSubmitted(q)
    baseline.reset()
    signal.reset()
    void baseline.start({ variant: 'baseline', query: q })
    void signal.start({ variant: 'signal', query: q })
  }

  const isStreaming =
    baseline.status === 'thinking' ||
    baseline.status === 'streaming' ||
    signal.status === 'thinking' ||
    signal.status === 'streaming'

  return (
    <div className={styles.surface}>
      <header className="flex items-center justify-between px-6 pt-2">
        <span className="text-[20px] tracking-tight text-white/85 font-medium">
          Gemini
        </span>
        <div className="flex items-center gap-3">
          <button type="button" className={styles.upgradePill} tabIndex={-1}>
            <Sparkles className="size-4 text-[#8ab4f8]" aria-hidden="true" />
            Upgrade to Google AI Plus
          </button>
          <span className={styles.avatar}>S</span>
        </div>
      </header>

      <main className="max-w-[1180px] mx-auto px-6 pb-24">
        {!submitted ? (
          <LandingState onSubmit={submit} />
        ) : (
          <ChatState
            query={submitted}
            baseline={baseline}
            signal={signal}
            isStreaming={isStreaming}
            onSubmit={submit}
          />
        )}
      </main>
    </div>
  )
}

function LandingState({ onSubmit }: { onSubmit: (q: string) => void }) {
  return (
    <div className="min-h-[78vh] flex flex-col items-center justify-center gap-6">
      <div className="text-center">
        <p className="text-[18px] text-white/60">Hi Samarjit</p>
        <h1 className="text-[40px] sm:text-[44px] font-medium text-white/90 tracking-tight mt-1">
          Where should we start?
        </h1>
      </div>

      <div className="w-full max-w-[720px]">
        <QueryPill onSubmit={onSubmit} placeholder="Ask Gemini" />
      </div>

      <div className="flex flex-wrap gap-2 justify-center max-w-[760px]">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className={styles.suggestionChip}
            onClick={() =>
              onSubmit(
                `Where should I buy Innersense Color Awakening Hairbath — ${s}?`
              )
            }
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

function ChatState({
  query,
  baseline,
  signal,
  isStreaming,
  onSubmit,
}: {
  query: string
  baseline: ReturnType<typeof useStream>
  signal: ReturnType<typeof useStream>
  isStreaming: boolean
  onSubmit: (q: string) => void
}) {
  return (
    <div className="pt-10 flex flex-col gap-7">
      <div className="flex justify-end">
        <div className={styles.userBubble}>{query}</div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ResponsePane
          variant="baseline"
          status={baseline.status}
          text={baseline.text}
          error={baseline.error}
        />
        <ResponsePane
          variant="signal"
          status={signal.status}
          text={signal.text}
          error={signal.error}
        />
      </div>

      <div className="w-full max-w-[760px] mx-auto pt-2">
        <QueryPill
          onSubmit={onSubmit}
          disabled={isStreaming}
          placeholder={
            isStreaming ? 'Streaming…' : 'Ask another question'
          }
        />
      </div>
    </div>
  )
}
