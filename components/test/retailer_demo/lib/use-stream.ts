'use client'

import { useCallback, useRef, useState } from 'react'

import type { StreamStatus, Variant } from './types'

type StartArgs = { variant: Variant; query: string }

export function useStream() {
  const [status, setStatus] = useState<StreamStatus>('idle')
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const reset = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setStatus('idle')
    setText('')
    setError(null)
  }, [])

  const start = useCallback(async ({ variant, query }: StartArgs) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setText('')
    setError(null)
    setStatus('thinking')

    let res: Response
    try {
      res = await fetch('/api/retailer-demo/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant, query }),
        signal: controller.signal,
      })
    } catch (e) {
      if (controller.signal.aborted) return
      setError('Network error')
      setStatus('error')
      return
    }

    if (!res.ok || !res.body) {
      setError(`Request failed (${res.status})`)
      setStatus('error')
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let receivedFirstToken = false

    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let idx: number
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, idx)
          buffer = buffer.slice(idx + 2)
          const line = frame.trim()
          if (!line.startsWith('data:')) continue
          const payload = line.slice(5).trim()
          if (payload === '[DONE]') {
            setStatus('done')
            return
          }
          try {
            const parsed = JSON.parse(payload) as
              | { token: string }
              | { error: string }
            if ('error' in parsed) {
              setError(parsed.error)
              setStatus('error')
              return
            }
            if (!receivedFirstToken) {
              receivedFirstToken = true
              setStatus('streaming')
            }
            setText((prev) => prev + parsed.token)
          } catch {
            // ignore malformed frame
          }
        }
      }
      setStatus((s) => (s === 'streaming' || s === 'thinking' ? 'done' : s))
    } catch (e) {
      if (controller.signal.aborted) return
      setError('Stream interrupted')
      setStatus('error')
    }
  }, [])

  return { status, text, error, start, reset }
}
