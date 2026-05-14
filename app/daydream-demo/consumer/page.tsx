import type { Metadata } from 'next'

import { ConsumerPage } from '@/components/test/daydream_demo/consumer/consumer-page'

export const metadata: Metadata = {
  title: 'Daydream',
  description: 'Find your look.',
}

export default function Page() {
  return <ConsumerPage />
}
