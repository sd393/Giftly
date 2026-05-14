import type { Metadata } from 'next'

import { DataLayerPage } from '@/components/test/daydream_demo/data-layer/data-layer-page'

export const metadata: Metadata = {
  title: 'Daydream — data layer',
  description: 'Catalog + Giftly signal join.',
}

export default function Page() {
  return <DataLayerPage />
}
