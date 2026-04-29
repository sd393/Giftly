'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'

const NAMESPACE = 'giftly-demo:'

function readKey<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(NAMESPACE + key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeKey<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(NAMESPACE + key, JSON.stringify(value))
  } catch {
    // private mode / quota exceeded — fall through silently
  }
}

// SSR-safe persisted state. First render uses the fallback so server/client
// markup matches; an effect then hydrates from localStorage on mount.
export function usePersistedState<T>(
  key: string,
  initial: T
): [T, Dispatch<SetStateAction<T>>, { hydrated: boolean }] {
  const [value, setValue] = useState<T>(initial)
  const [hydrated, setHydrated] = useState(false)
  const initialRef = useRef(initial)

  useEffect(() => {
    setValue(readKey<T>(key, initialRef.current))
    setHydrated(true)
  }, [key])

  const setPersisted: Dispatch<SetStateAction<T>> = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved =
          typeof next === 'function'
            ? (next as (p: T) => T)(prev)
            : next
        writeKey(key, resolved)
        return resolved
      })
    },
    [key]
  )

  return [value, setPersisted, { hydrated }]
}
