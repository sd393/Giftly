import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

const NAV_ITEMS = [
  { href: '/', label: 'inbound' },
  { href: '/creators', label: 'creators' },
  { href: '/brands', label: 'brands' },
  { href: '/outbound', label: 'outbound' },
  { href: '/settings', label: 'settings' },
]

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Middleware already enforces this, but belt-and-suspenders for direct hits
  // to the rewritten /platform/* paths.
  if (!user || !user.email?.toLowerCase().endsWith('@trygiftly.com')) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen flex bg-cream text-ink">
      <aside className="hidden md:flex w-56 shrink-0 border-r border-line/60 bg-white/60 flex-col">
        <div className="px-5 py-5 border-b border-line/60">
          <Link href="/" className="font-display text-[1.25rem] tracking-tight">
            giftly
          </Link>
          <p className="mt-0.5 text-[0.7rem] uppercase tracking-[0.15em] text-muted-warm">
            internal
          </p>
        </div>
        <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2 text-[0.875rem] font-medium text-ink-soft hover:text-ink hover:bg-cream-warm rounded"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-line/60 px-3 py-3">
          <p className="px-2 text-[0.75rem] text-muted-warm truncate">
            {user.email}
          </p>
        </div>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}
