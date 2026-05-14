'use client'

import { ChevronDown, Mic, Plus, SlidersHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import styles from './styles.module.css'

export function QueryPill({
  onSubmit,
  disabled,
  placeholder = 'Ask Gemini',
}: {
  onSubmit: (q: string) => void
  disabled?: boolean
  placeholder?: string
}) {
  const [value, setValue] = useState('')
  const taRef = useRef<HTMLTextAreaElement>(null)
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    const update = () => setCompact(window.innerWidth < 700)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 220) + 'px'
  }, [value])

  function fire() {
    const q = value.trim()
    if (!q || disabled) return
    onSubmit(q)
    setValue('')
  }

  return (
    <form
      className={`${styles.pill} px-5 pt-4 pb-2.5 w-full`}
      onSubmit={(e) => {
        e.preventDefault()
        fire()
      }}
    >
      <textarea
        ref={taRef}
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            fire()
          }
        }}
        placeholder={placeholder}
        className={styles.pillTextarea}
        aria-label="Ask Gemini"
        disabled={disabled}
      />

      <div className="flex items-center gap-1 mt-1">
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Add"
          tabIndex={-1}
        >
          <Plus className="size-[18px]" aria-hidden="true" />
        </button>

        {!compact && (
          <button
            type="button"
            className={styles.chip}
            aria-label="Tools"
            tabIndex={-1}
          >
            <SlidersHorizontal className="size-[15px]" aria-hidden="true" />
            Tools
          </button>
        )}

        <div className="flex-1" />

        <button
          type="button"
          className={styles.chip}
          aria-label="Model selector"
          tabIndex={-1}
        >
          Pro
          <ChevronDown className="size-[14px]" aria-hidden="true" />
        </button>

        {!compact && (
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Voice (decorative)"
            tabIndex={-1}
          >
            <Mic className="size-[17px]" aria-hidden="true" />
          </button>
        )}
      </div>
    </form>
  )
}
