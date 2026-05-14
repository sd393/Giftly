'use client'

import type { ReactNode } from 'react'

const KEYWORDS = new Set([
  'SELECT',
  'FROM',
  'LEFT',
  'JOIN',
  'ON',
  'LIMIT',
  'WHERE',
  'AS',
  'AND',
  'OR',
])

function tintLine(line: string, lineKey: string): ReactNode {
  // Tokenize on whitespace + punctuation while preserving them, so a SQL line
  // like "SELECT p.*, g.* FROM ..." renders with keywords blue and identifiers
  // dark slate. No real parser — just a regex split good enough for the 3-line
  // queries we render here.
  const parts = line.split(/(\s+|[.,;()*])/)
  return (
    <span>
      {parts.map((part, i) => {
        const key = `${lineKey}-${i}`
        if (!part) return null
        const upper = part.toUpperCase()
        if (KEYWORDS.has(upper)) {
          return (
            <span key={key} className="text-sky-700 font-semibold">
              {part}
            </span>
          )
        }
        if (part === '*') {
          return (
            <span key={key} className="text-amber-700">
              {part}
            </span>
          )
        }
        if (/^[0-9]+$/.test(part)) {
          return (
            <span key={key} className="text-rose-700">
              {part}
            </span>
          )
        }
        return (
          <span key={key} className="text-zinc-800">
            {part}
          </span>
        )
      })}
    </span>
  )
}

export function SnowflakeSqlBlock({ sql }: { sql: string }) {
  const lines = sql.split('\n')
  return (
    <pre className="m-0 overflow-x-auto p-4 font-mono text-[13px] leading-6 text-zinc-800 tabular-nums">
      {lines.map((line, idx) => (
        <div key={idx} className="flex">
          <span className="select-none pr-4 text-right text-zinc-400 tabular-nums w-6">
            {idx + 1}
          </span>
          <span className="flex-1 whitespace-pre">
            {line.length === 0 ? ' ' : tintLine(line, `l${idx}`)}
          </span>
        </div>
      ))}
    </pre>
  )
}
