'use client'

import styles from './styles.module.css'

export function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-3" aria-live="polite">
      <span className={styles.thinkingBar} />
      <span className="text-[13px] text-white/40">Thinking…</span>
    </div>
  )
}
