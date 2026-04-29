import { DollarSign, Gift, History, Inbox } from 'lucide-react'

import { cn } from '@/lib/utils'

import { CURRENT_CREATOR } from '../lib/mock-data'

const NAV = [
  { label: 'Inbox', icon: Inbox, active: true },
  { label: 'Active gifts', icon: Gift, active: true },
  { label: 'History', icon: History, active: false },
  { label: 'Earnings', icon: DollarSign, active: false },
]

export function CreatorSidebar() {
  return (
    <aside className="hidden md:flex w-60 shrink-0 border-r border-line/60 bg-white/60 flex-col">
      <div className="px-5 py-5 border-b border-line/60">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={CURRENT_CREATOR.avatarUrl}
            alt=""
            width={40}
            height={40}
            className="size-10 rounded-full object-cover"
            loading="lazy"
          />
          <div className="min-w-0">
            <p className="font-display text-[0.95rem] tracking-tight truncate">
              {CURRENT_CREATOR.handle}
            </p>
            <p className="text-[0.7rem] uppercase tracking-[0.15em] text-muted-warm">
              creator
            </p>
          </div>
        </div>
        <p className="mt-3 text-[0.75rem] text-ink-soft">
          {CURRENT_CREATOR.followersLabel} followers · {CURRENT_CREATOR.city}
        </p>
      </div>

      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
        {NAV.map(({ label, icon: Icon, active }) => (
          <span
            key={label}
            aria-disabled={!active}
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-[0.85rem] font-medium rounded',
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
        <p className="text-[0.75rem] text-ink-soft">acting as creator</p>
      </div>
    </aside>
  )
}
