import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'

import { ActiveGiftsTab } from './active-gifts-tab'
import { InboxTab } from './inbox-tab'
import { CreatorSidebar } from './sidebar'

export default function CreatorPage() {
  return (
    <div className="min-h-screen flex bg-cream text-ink">
      <CreatorSidebar />

      <main className="flex-1 min-w-0 px-6 md:px-10 py-8 pb-24">
        <header className="mb-6">
          <p className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-warm font-medium">
            creator portal
          </p>
          <h1 className="font-display text-[1.75rem] tracking-tight mt-1">
            hey samantha
          </h1>
          <p className="mt-1 text-[0.85rem] text-muted-warm">
            3 new offers · 1 active gift waiting on your reaction
          </p>
        </header>

        <Tabs defaultValue="inbox" className="max-w-[860px]">
          <TabsList className="bg-cream-warm/70 border border-line/60">
            <TabsTrigger value="inbox">Inbox</TabsTrigger>
            <TabsTrigger value="gifts">Active gifts</TabsTrigger>
          </TabsList>

          <TabsContent value="inbox" className="mt-6">
            <InboxTab />
          </TabsContent>

          <TabsContent value="gifts" className="mt-6">
            <ActiveGiftsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
