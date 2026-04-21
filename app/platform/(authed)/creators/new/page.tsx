import Link from 'next/link'

import { PageHeader } from '../../_components/page-header'

import { NewCreatorForm } from '../_components/new-creator-form'

export default function NewCreatorPage() {
  return (
    <div className="px-6 md:px-10 py-8 max-w-[780px]">
      <div className="flex items-center gap-2 text-[0.8rem] text-muted-warm mb-2">
        <Link href="/creators" className="hover:text-ink">
          creators
        </Link>
        <span>/</span>
        <span className="text-ink">new</span>
      </div>

      <PageHeader
        title="new creator"
        subtitle="add a creator manually (not via the public form)"
      />

      <div className="mt-6 bg-white border border-line/60 rounded-md p-5">
        <NewCreatorForm />
      </div>
    </div>
  )
}
