'use client'

import { Sparkles } from 'lucide-react'

import {
  RUFUS_WITHOUT_GIFTLY,
  RUFUS_WITH_GIFTLY,
} from '../lib/mock-data'
import type { RufusMessage, RufusMode } from '../lib/types'

import { GiftlySignalBlock } from './giftly-signal-block'

export function RufusPanel({
  mode,
  onModeChange,
}: {
  mode: RufusMode
  onModeChange: (next: RufusMode) => void
}) {
  const thread =
    mode === 'with' ? RUFUS_WITH_GIFTLY.thread : RUFUS_WITHOUT_GIFTLY.thread

  return (
    <aside className="hidden xl:flex flex-col w-[360px] shrink-0 bg-white border border-[#D5D9D9] rounded-md overflow-hidden self-start sticky top-3">
      {/* Rufus header */}
      <header className="px-4 py-3 border-b border-[#D5D9D9] bg-gradient-to-r from-[#F0F8FF] to-[#FFF7E6]">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-7 rounded-full bg-gradient-to-br from-[#FF9900] to-[#F08804] flex items-center justify-center"
          >
            <Sparkles className="size-4 text-white" aria-hidden="true" />
          </span>
          <div>
            <p className="font-bold text-[0.95rem] text-[#0F1111] leading-tight">
              Rufus
            </p>
            <p className="text-[0.7rem] text-[#565959] leading-tight">
              Your AI shopping assistant
            </p>
          </div>
        </div>

        <ModeToggle mode={mode} onChange={onModeChange} />
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 text-[0.86rem] text-[#0F1111] leading-[1.55]">
        {mode === 'with' ? (
          <div className="-mx-1">
            <GiftlySignalBlock />
          </div>
        ) : null}

        {thread.map((m, i) => (
          <RufusBubble key={i} message={m} />
        ))}
      </div>

      <footer className="border-t border-[#D5D9D9] px-3 py-2 bg-[#FAFAFA]">
        <input
          type="text"
          placeholder="Ask a follow-up..."
          className="w-full h-9 rounded-full border border-[#D5D9D9] px-3 text-[0.82rem] outline-none focus:ring-2 focus:ring-[#FF9900]"
        />
      </footer>
    </aside>
  )
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: RufusMode
  onChange: (next: RufusMode) => void
}) {
  return (
    <div className="mt-3 flex items-center gap-1 p-0.5 rounded-full bg-white border border-[#D5D9D9] text-[0.72rem] font-medium">
      {(['without', 'with'] as RufusMode[]).map((m) => {
        const active = mode === m
        return (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            aria-pressed={active}
            className={
              'flex-1 px-2.5 py-1 rounded-full transition-colors ' +
              (active
                ? 'bg-[#0F1111] text-white'
                : 'text-[#565959] hover:text-[#0F1111]')
            }
          >
            {m === 'without' ? 'Without Giftly' : 'With Giftly signal'}
          </button>
        )
      })}
    </div>
  )
}

function RufusBubble({ message }: { message: RufusMessage }) {
  if (message.speaker === 'user') {
    return (
      <div className="flex justify-end">
        <div className="bg-[#F0F2F2] text-[#0F1111] rounded-2xl rounded-tr-sm px-3 py-2 max-w-[85%]">
          {message.text}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 max-w-[95%]">
      <p>{message.text}</p>

      {message.bullets ? (
        <ol className="space-y-2 list-decimal pl-5">
          {message.bullets.map((b) => (
            <li key={b.title}>
              <span className="font-bold">{b.title}</span> — {b.body}
            </li>
          ))}
        </ol>
      ) : null}

      {message.reviewQuote ? (
        <blockquote className="mt-1 border-l-2 border-[#FF9900] pl-3 italic text-[#565959] text-[0.82rem]">
          Top review quote: &ldquo;{message.reviewQuote}&rdquo;{' '}
          <span className="not-italic text-[0.72rem]">(verified purchase)</span>
        </blockquote>
      ) : null}

      {message.recommendation ? (
        <div className="mt-1 rounded-md border border-[#FF9900] bg-[#FFF7E6] p-3">
          <p className="text-[0.72rem] uppercase tracking-[0.1em] font-bold text-[#0F1111]">
            recommendation
          </p>
          <p className="font-bold mt-0.5">
            {message.recommendation.product} ($
            {message.recommendation.priceUsd.toFixed(2)})
          </p>
          <p className="text-[0.82rem] text-[#0F1111] mt-1 leading-[1.45]">
            {message.recommendation.rationale}
          </p>
        </div>
      ) : null}
    </div>
  )
}
