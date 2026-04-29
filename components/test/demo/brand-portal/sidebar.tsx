import { Boxes, ClipboardList, LineChart, Settings } from 'lucide-react'

import { cn } from '@/lib/utils'

import { BRAND } from '../lib/mock-data'

const NAV = [
  { label: 'Products', icon: Boxes, active: true },
  { label: 'Matches', icon: ClipboardList, active: true },
  { label: 'Performance', icon: LineChart, active: false },
  { label: 'Settings', icon: Settings, active: false },
]

export function BrandSidebar() {
  return (
    <aside className="hidden md:flex w-60 shrink-0 border-r border-line/60 bg-white/60 flex-col">
      <div className="px-5 py-5 border-b border-line/60">
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="size-9 rounded-md bg-coral/10 flex items-center justify-center font-display text-coral text-[1rem]"
          >
            L
          </div>
          <div className="min-w-0">
            <p className="font-display text-[0.95rem] tracking-tight truncate">
              {BRAND.name}
            </p>
            <p className="text-[0.7rem] uppercase tracking-[0.15em] text-muted-warm">
              brand portal
            </p>
          </div>
        </div>
        <p className="mt-3 text-[0.75rem] text-ink-soft">
          Founded {BRAND.founded} · {BRAND.category} · {BRAND.segment}
        </p>
      </div>

      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
        {NAV.map(({ label, icon: Icon, active }) => (
          <span
            key={label}
            aria-disabled={!active}
            className={cn(
              'group flex items-center gap-2 px-3 py-2 text-[0.85rem] font-medium rounded',
              active
                ? 'text-ink hover:text-coral hover:bg-coral/5 cursor-default'
                : 'text-muted-warm cursor-not-allowed'
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </span>
        ))}
      </nav>

      <div className="border-t border-line/60 px-4 py-3">
        <p className="text-[0.7rem] uppercase tracking-[0.15em] text-muted-warm">
          demo
        </p>
        <p className="text-[0.75rem] text-ink-soft">acting as brand</p>
      </div>
    </aside>
  )
}
