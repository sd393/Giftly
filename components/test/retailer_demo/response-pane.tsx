'use client'

import { Fragment } from 'react'

import { GeminiOrb } from './gemini-orb'
import { GroveListingCard } from './grove-listing-card'
import type { StreamStatus } from './lib/types'
import styles from './styles.module.css'
import { ThinkingIndicator } from './thinking-indicator'

export function ResponsePane({
  variant,
  status,
  text,
  error,
}: {
  variant: 'baseline' | 'signal'
  status: StreamStatus
  text: string
  error: string | null
}) {
  const isSignal = variant === 'signal'
  const showCursor = status === 'streaming'
  const showThinking = status === 'thinking'

  return (
    <section className={styles.pane}>
      <header className="flex items-center gap-3">
        <span
          className={isSignal ? styles.paneLabelSignal : styles.paneLabelMuted}
        >
          {isSignal ? 'UCP + Giftly Signal' : 'No UCP'}
        </span>
      </header>

      <div className="flex gap-3 items-start">
        <GeminiOrb size={26} spinning={showThinking} className="mt-1 shrink-0" />

        <div className="flex-1 min-w-0">
          {error ? (
            <p className={styles.errorInline}>
              {error === 'stream_failed'
                ? 'Stream failed. The other pane is still running.'
                : error}
            </p>
          ) : showThinking && !text ? (
            <ThinkingIndicator />
          ) : (
            <div className={styles.paneText}>
              <RichText text={text} />
              {showCursor && <span className={styles.cursor} aria-hidden />}
            </div>
          )}
        </div>
      </div>

      {isSignal && status === 'done' && !error && <GroveListingCard />}
    </section>
  )
}

// Renders a streaming string with two transformations:
//   **bold** -> <strong>
//   newlines -> <br/>
// Avoids pulling in a markdown library; the `**` pairing is the
// only inline syntax the model emits in practice.
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) {
          return (
            <strong key={i} className="text-white font-semibold">
              {p.slice(2, -2)}
            </strong>
          )
        }
        const lines = p.split('\n')
        return (
          <Fragment key={i}>
            {lines.map((ln, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {ln}
              </Fragment>
            ))}
          </Fragment>
        )
      })}
    </>
  )
}
