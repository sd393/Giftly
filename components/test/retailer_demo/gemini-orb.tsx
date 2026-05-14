'use client'

import styles from './styles.module.css'
import { cn } from '@/lib/utils'

export function GeminiOrb({
  size = 28,
  spinning = false,
  className,
}: {
  size?: number
  spinning?: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(styles.orb, spinning && styles.orbSpin, className)}
      style={{ width: size, height: size }}
    />
  )
}
