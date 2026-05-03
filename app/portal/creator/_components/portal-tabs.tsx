'use client'

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'

import { ActiveGiftsTab } from './active-gifts-tab'
import { InboxTab } from './inbox-tab'

export type PortalMatch = {
  id: string
  stage: string
  why_matched: string | null
  commission_pct: number | null
  proposed_at: string
  shipped_at: string | null
  tracking_number: string | null
  tracking_carrier: string | null
  product: {
    id: string
    name: string
    image_url: string | null
    retail_price_cents: number | null
    brand: {
      id: string
      brand_name: string
    } | null
  } | null
}

export function PortalTabs({
  inbox,
  active,
}: {
  inbox: PortalMatch[]
  active: PortalMatch[]
}) {
  return (
    <Tabs
      defaultValue={inbox.length > 0 ? 'inbox' : 'gifts'}
      className="max-w-[860px]"
    >
      <TabsList className="bg-cream-warm/70 border border-line/60">
        <TabsTrigger value="inbox">Inbox</TabsTrigger>
        <TabsTrigger value="gifts">Active gifts</TabsTrigger>
      </TabsList>
      <TabsContent value="inbox" className="mt-6">
        <InboxTab matches={inbox} />
      </TabsContent>
      <TabsContent value="gifts" className="mt-6">
        <ActiveGiftsTab matches={active} />
      </TabsContent>
    </Tabs>
  )
}
