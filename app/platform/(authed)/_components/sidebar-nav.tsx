'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

type NavItem = { href: string; label: string }

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()

  return (
    <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
      {items.map((item) => {
        const active =
          item.href === '/'
            ? pathname === '/'
            : pathname === item.href || pathname.startsWith(`${item.href}/`)

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group relative px-3 py-2 text-[0.875rem] font-medium rounded transition-colors',
              active
                ? 'text-coral bg-coral/10'
                : 'text-ink-soft hover:text-ink hover:bg-cream-warm'
            )}
          >
            {active ? (
              <span
                aria-hidden="true"
                className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-coral rounded-r"
              />
            ) : null}
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
