'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/demo/brand', label: 'brand' },
  { href: '/demo/creator', label: 'creator' },
  { href: '/demo/data', label: 'data' },
  { href: '/demo/shopping', label: 'shopping' },
]

export function DemoSwitcher() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-1 bg-ink/90 text-cream backdrop-blur-md rounded-full px-1.5 py-1 shadow-lg text-[0.72rem] font-medium">
      {LINKS.map((l) => {
        const active = pathname?.startsWith(l.href)
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              'px-2.5 py-1 rounded-full transition-colors',
              active
                ? 'bg-coral text-cream'
                : 'text-cream/70 hover:text-cream hover:bg-cream/10'
            )}
          >
            {l.label}
          </Link>
        )
      })}
    </div>
  )
}
