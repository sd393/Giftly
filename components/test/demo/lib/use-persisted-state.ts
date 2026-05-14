'use client'

import {
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'

// Demo state intentionally does NOT persist — every refresh restarts the
// flow from the initial value. Keeps the original tuple shape (with a
// `hydrated` flag) so existing callsites compile unchanged.
export function usePersistedState<T>(
  _key: string,
  initial: T
): [T, Dispatch<SetStateAction<T>>, { hydrated: boolean }] {
  const [value, setValue] = useState<T>(initial)
  return [value, setValue, { hydrated: true }]
}
