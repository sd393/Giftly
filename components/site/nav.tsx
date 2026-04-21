'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { Logo } from '@/components/site/logo'

export function Nav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      data-scrolled={scrolled}
      className="fixed top-0 inset-x-0 z-50 px-4 py-1.5 md:px-6 md:py-2 flex items-center justify-between bg-white/90 backdrop-blur-xl border-b border-transparent data-[scrolled=true]:border-line transition-colors"
    >
      <Link href="/" aria-label="giftly home" className="flex-1">
        <Logo size="sm" color="coral" />
      </Link>

      <div className="hidden md:flex gap-8 items-center justify-center flex-1">
        <Link href="/about" className="relative py-1 text-[0.8rem] font-medium text-ink after:absolute after:left-0 after:-bottom-0.5 after:h-px after:w-0 after:bg-ink after:transition-[width] after:duration-300 hover:after:w-full">
          about
        </Link>
        <Link href="/brands" className="relative py-1 text-[0.8rem] font-medium text-ink after:absolute after:left-0 after:-bottom-0.5 after:h-px after:w-0 after:bg-ink after:transition-[width] after:duration-300 hover:after:w-full">
          for brands
        </Link>
        <Link href="/creators" className="relative py-1 text-[0.8rem] font-medium text-ink after:absolute after:left-0 after:-bottom-0.5 after:h-px after:w-0 after:bg-ink after:transition-[width] after:duration-300 hover:after:w-full">
          for creators
        </Link>
      </div>

      <div className="flex-1 flex justify-end">
        <a
          href="https://app.trygiftly.com"
          className="relative py-1 text-[0.8rem] font-medium text-ink after:absolute after:left-0 after:-bottom-0.5 after:h-px after:w-0 after:bg-ink after:transition-[width] after:duration-300 hover:after:w-full"
        >
          log in
        </a>
      </div>
    </nav>
  )
}
