import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'

import { RetailerDemoPage } from '@/components/test/retailer_demo/retailer-demo-page'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Giftly × Grove — Gemini demo',
  description:
    'Conceptual mock — same Gemini, same query, two data layers, two answers.',
}

export default function Page() {
  return (
    <div className={jakarta.variable}>
      <RetailerDemoPage />
    </div>
  )
}
