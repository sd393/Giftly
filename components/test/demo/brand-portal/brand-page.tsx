import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'

import { BrandSidebar } from './sidebar'
import { MatchesTab } from './matches-tab'
import { ProductsTab } from './products-tab'

export default function BrandPage() {
  return (
    <div className="min-h-screen flex bg-cream text-ink">
      <BrandSidebar />

      <main className="flex-1 min-w-0 px-6 md:px-10 py-8 pb-24">
        <header className="mb-6">
          <p className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-warm font-medium">
            brand portal
          </p>
          <h1 className="font-display text-[1.75rem] tracking-tight mt-1">
            welcome back, lumina pro
          </h1>
          <p className="mt-1 text-[0.85rem] text-muted-warm">
            5 new suggested creators · 3 shipments in motion
          </p>
        </header>

        <Tabs defaultValue="matches" className="max-w-[1100px]">
          <TabsList className="bg-cream-warm/70 border border-line/60">
            <TabsTrigger value="products">Your products</TabsTrigger>
            <TabsTrigger value="matches">Active matches</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="mt-6">
            <ProductsTab />
          </TabsContent>

          <TabsContent value="matches" className="mt-6">
            <MatchesTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
