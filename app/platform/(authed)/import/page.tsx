import { PageHeader } from '../_components/page-header'
import { InstagramImportForm } from './_components/instagram-import-form'

export default function ImportPage() {
  return (
    <div className="px-6 md:px-10 py-8 space-y-8">
      <PageHeader
        title="import"
        subtitle="bulk-load outreach history from external sources"
      />

      <section className="space-y-3">
        <div>
          <h2 className="text-[1rem] font-medium">Instagram DMs</h2>
          <p className="text-[0.875rem] text-muted-warm max-w-2xl">
            Upload a Meta &quot;Download Your Information&quot; ZIP. The page
            parses it in your browser, shows a preview, and logs only new
            outbound DMs (dedup via external_id). Recipients become
            outreach-sourced creator records and stay hidden from the
            /creators directory until they sign up.
          </p>
        </div>
        <InstagramImportForm />
      </section>
    </div>
  )
}
