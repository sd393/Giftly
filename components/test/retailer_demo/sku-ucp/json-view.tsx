'use client'

import { Fragment } from 'react'

import { cn } from '@/lib/utils'

// JSON viewer that:
//  - renders syntax-tinted, indented JSON
//  - highlights any subtree whose nearest enclosing key matches
//    `highlightKeys` (e.g. `x_giftly`) so the CEO can see at a glance
//    exactly which fields the Giftly enrichment introduces.
//
// Trade-off: written by hand instead of pulling in react-json-view to
// keep the bundle small and the styling fully under our control.

const INDENT = '  '

export function JsonView({
  value,
  highlightKeys = [],
}: {
  value: unknown
  highlightKeys?: string[]
}) {
  return (
    <pre className="font-mono text-[12.5px] leading-[1.55] text-[#2a1a12] overflow-x-auto">
      <code>
        {render(value, 0, false, highlightKeys, false)}
      </code>
    </pre>
  )
}

function render(
  value: unknown,
  depth: number,
  trailingComma: boolean,
  highlightKeys: string[],
  inHighlightedSubtree: boolean
): React.ReactNode {
  const indent = INDENT.repeat(depth)
  const closeIndent = INDENT.repeat(Math.max(depth - 1, 0))

  if (value === null) {
    return (
      <span>
        <span className="text-[#8a7566]">null</span>
        {trailingComma ? ',' : ''}
      </span>
    )
  }

  if (typeof value === 'string') {
    return (
      <span>
        <span className="text-[#0a7d56]">"{escapeJsonString(value)}"</span>
        {trailingComma ? ',' : ''}
      </span>
    )
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return (
      <span>
        <span className="text-[#9a4d2a]">{String(value)}</span>
        {trailingComma ? ',' : ''}
      </span>
    )
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span>[]{trailingComma ? ',' : ''}</span>
    return (
      <Fragment>
        {'['}
        {'\n'}
        {value.map((item, i) => (
          <Fragment key={i}>
            <Highlightable enabled={inHighlightedSubtree}>
              {indent}
              {render(item, depth + 1, i < value.length - 1, highlightKeys, inHighlightedSubtree)}
            </Highlightable>
            {'\n'}
          </Fragment>
        ))}
        {closeIndent}
        {']'}
        {trailingComma ? ',' : ''}
      </Fragment>
    )
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) return <span>{'{}'}{trailingComma ? ',' : ''}</span>
    return (
      <Fragment>
        {'{'}
        {'\n'}
        {entries.map(([k, v], i) => {
          const keyTriggersHighlight = highlightKeys.includes(k)
          const childInHighlight = inHighlightedSubtree || keyTriggersHighlight
          return (
            <Highlightable key={k} enabled={childInHighlight}>
              {indent}
              <span className={childInHighlight ? 'text-[#c84538]' : 'text-[#2a1a12]'}>
                "{k}"
              </span>
              <span className="text-[#8a7566]">: </span>
              {render(v, depth + 1, i < entries.length - 1, highlightKeys, childInHighlight)}
              {'\n'}
            </Highlightable>
          )
        })}
        {closeIndent}
        {'}'}
        {trailingComma ? ',' : ''}
      </Fragment>
    )
  }

  return null
}

function Highlightable({
  enabled,
  children,
}: {
  enabled: boolean
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        'inline',
        enabled &&
          'bg-[rgba(229,90,78,0.07)] outline outline-1 outline-[rgba(229,90,78,0.18)] rounded-[2px] -mx-0.5 px-0.5'
      )}
    >
      {children}
    </span>
  )
}

function escapeJsonString(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
}
