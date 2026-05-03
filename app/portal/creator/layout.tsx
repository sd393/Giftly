import { redirect } from 'next/navigation'

import { getCreatorForCurrentUser } from '@/lib/portal/auth'

import { CreatorSidebar } from './_components/sidebar'

export default async function CreatorPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const creator = await getCreatorForCurrentUser()
  if (!creator) redirect('/login')

  return (
    <div className="min-h-screen flex bg-cream text-ink">
      <CreatorSidebar creator={creator} />
      <main className="flex-1 min-w-0 px-6 md:px-10 py-8 pb-24">
        {children}
      </main>
    </div>
  )
}
