import type { Metadata } from 'next'

import { TopNav } from '@/components/test/daydream_demo/top-nav'

export const metadata: Metadata = {
  title: 'Daydream',
}

export default function DaydreamDemoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="relative z-[2] min-h-screen bg-white text-zinc-900 font-sans">
      <TopNav />
      {children}
    </main>
  )
}
