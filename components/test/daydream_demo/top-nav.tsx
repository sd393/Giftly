'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/daydream-demo/data-layer', label: 'Data' },
  { href: '/daydream-demo/consumer', label: 'Consumer' },
] as const

export function TopNav() {
  const pathname = usePathname()
  return (
    <nav className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3">
      <Link
        href="/daydream-demo/data-layer"
        className="font-serif text-lg tracking-tight text-zinc-900"
      >
        giftly
      </Link>
      <div className="flex items-center gap-6 text-sm">
        {LINKS.map((link) => {
          const active = pathname?.startsWith(link.href) ?? false
          return (
            <Link
              key={link.href}
              href={link.href}
              className={
                active
                  ? 'text-zinc-900 underline underline-offset-4 decoration-zinc-900'
                  : 'text-zinc-500 hover:text-zinc-900'
              }
            >
              {link.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
