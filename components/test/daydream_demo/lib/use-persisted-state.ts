'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'

const STORAGE_PREFIX = 'dd:'

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key)
    if (raw == null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
  } catch {
    /* quota or disabled storage — silently drop */
  }
}

export function usePersistedState<T>(
  key: string,
  initial: T
): [T, Dispatch<SetStateAction<T>>, { hydrated: boolean }] {
  const [value, setValue] = useState<T>(initial)
  const [hydrated, setHydrated] = useState(false)
  const initialRef = useRef(initial)

  useEffect(() => {
    setValue(read(key, initialRef.current))
    setHydrated(true)
  }, [key])

  const setAndPersist: Dispatch<SetStateAction<T>> = useCallback(
    (updater) => {
      setValue((prev) => {
        const next =
          typeof updater === 'function'
            ? (updater as (p: T) => T)(prev)
            : updater
        write(key, next)
        return next
      })
    },
    [key]
  )

  return [value, setAndPersist, { hydrated }]
}
