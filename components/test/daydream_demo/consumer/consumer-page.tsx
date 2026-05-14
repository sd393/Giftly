'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowUp } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

import { usePersistedState } from '../lib/use-persisted-state'
import { DAYDREAM_DEFAULT_PICKS, GIFTLY_PICKS } from '../lib/products'
import type { ConsumerCard } from '../lib/types'
import { ProductCard } from './product-card'
import { SignalToggle } from './signal-toggle'

const ASSISTANT_LINE = 'A few that breathe — picked for a humid NY afternoon.'
const THINKING_MS = 850

export function ConsumerPage() {
  const [signalOn, setSignalOn] = usePersistedState<boolean>(
    'giftlySignal',
    false
  )
  const [lastQuery, setLastQuery] = useState<string>('')
  const [draft, setDraft] = useState('')
  const [thinking, setThinking] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const submitted = lastQuery.trim().length > 0
  const display: ConsumerCard[] = signalOn ? GIFTLY_PICKS : DAYDREAM_DEFAULT_PICKS

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const query = draft.trim()
    if (query === '') return
    setLastQuery(query)
    setDraft('')
    inputRef.current?.blur()
    setThinking(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setThinking(false), THINKING_MS)
  }

  return (
    <div className="min-h-[calc(100vh-3.25rem)] bg-white">
      <SignalToggle signalOn={signalOn} onSignalChange={setSignalOn} />

      {/* Daydream chrome header */}
      <header className="grid grid-cols-3 items-center border-b border-zinc-100 px-6 py-3">
        <nav className="flex items-center gap-5 text-[12.5px]">
          <a className="text-zinc-900">Explore</a>
          <a className="font-medium text-zinc-900 underline underline-offset-4">
            Chat
          </a>
          <a className="text-zinc-500 hover:text-zinc-900">Favorites</a>
        </nav>
        <div className="flex items-center justify-center gap-1">
          <span className="font-serif text-[22px] tracking-tight text-zinc-900">
            Daydream
          </span>
          <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-indigo-700">
            NEW
          </span>
        </div>
        <div className="flex items-center justify-end gap-3 text-[12.5px]">
          <a className="text-zinc-700">SIGN IN</a>
          <button
            type="button"
            className="rounded-full bg-zinc-900 px-4 py-1.5 text-white"
          >
            GET STARTED
          </button>
        </div>
      </header>

      {/* Chat thread (or empty state) */}
      <main className="mx-auto flex max-w-[780px] flex-col gap-6 px-6 pb-40 pt-10">
        {submitted ? (
          <>
            <div className="flex justify-end">
              <div className="rounded-2xl rounded-br-md bg-zinc-100 px-4 py-2.5 text-[14px] text-zinc-900">
                {lastQuery}
              </div>
            </div>

            <div className="space-y-4">
              {thinking ? (
                <div className="flex h-12 items-center gap-1.5">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400 [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400 [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400 [animation-delay:300ms]" />
                </div>
              ) : (
                <>
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="font-serif text-[18px] leading-snug text-zinc-900"
                  >
                    {ASSISTANT_LINE}
                  </motion.p>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={signalOn ? 'on' : 'off'}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      className="-mx-6 overflow-x-auto px-6 pb-4"
                    >
                      <div className="flex gap-4">
                        {display.map((card, i) => (
                          <motion.div
                            key={card.product_id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              duration: 0.3,
                              delay: i * 0.025,
                              ease: [0.22, 1, 0.36, 1],
                            }}
                          >
                            <ProductCard card={card} />
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  <p className="text-[12.5px] text-zinc-500">
                    {display.length} options
                  </p>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex min-h-[40vh] items-center justify-center text-center">
            <p className="font-serif text-[20px] italic text-zinc-400">
              what are you in the mood for?
            </p>
          </div>
        )}
      </main>

      {/* Composer (sticky) */}
      <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-white via-white/95 to-white/0 px-6 pb-6 pt-10">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-[780px] items-center gap-2 rounded-full border border-zinc-200 bg-white px-5 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] focus-within:border-zinc-300"
        >
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Ask Daydream"
            className="flex-1 bg-transparent text-[14px] text-zinc-900 placeholder:text-zinc-400 outline-none"
          />
          <button
            type="submit"
            aria-label="send"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-white transition-colors hover:bg-zinc-700"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
