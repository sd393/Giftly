'use client'

import { Gift, Inbox, Settings } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { signOutAction } from '@/lib/portal/sign-out-action'
import { cn } from '@/lib/utils'

const NAV = [
  { label: 'Inbox', icon: Inbox, active: true },
  { label: 'Active gifts', icon: Gift, active: true },
  { label: 'Settings', icon: Settings, active: false },
]

export function CreatorSidebar({
  creator,
}: {
  creator: { name: string | null; email: string }
}) {
  return (
    <aside className="hidden md:flex w-60 shrink-0 border-r border-line/60 bg-white/60 flex-col">
      <div className="px-5 py-5 border-b border-line/60">
        <p className="font-display text-[0.95rem] tracking-tight truncate">
          {creator.name ?? creator.email}
        </p>
        <p className="text-[0.7rem] uppercase tracking-[0.15em] text-muted-warm">
          creator portal
        </p>
      </div>
      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
        {NAV.map(({ label, icon: Icon, active }) => (
          <span
            key={label}
            aria-disabled={!active}
            className={cn(
              'group flex items-center gap-2 px-3 py-2 text-[0.85rem] font-medium rounded',
              active ? 'text-ink' : 'text-muted-warm cursor-not-allowed',
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </span>
        ))}
      </nav>
      <div className="border-t border-line/60 px-4 py-3">
        <p className="text-[0.7rem] text-muted-warm truncate">
          {creator.email}
        </p>
        <form action={signOutAction}>
          <Button type="submit" variant="ghost" size="sm" className="px-0">
            sign out
          </Button>
        </form>
      </div>
    </aside>
  )
}
