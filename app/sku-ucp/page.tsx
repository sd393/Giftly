import type { Metadata } from 'next'

import { SkuUcpPage } from '@/components/test/retailer_demo/sku-ucp/sku-ucp-page'

export const metadata: Metadata = {
  title: 'Giftly × Grove — SKU UCP View',
  description:
    'How Grove’s listings look to AI shopping agents, with and without the Giftly signal layered in.',
}

export default function Page() {
  return <SkuUcpPage />
}
