'use client'

import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div className="max-w-md">
      <p className="text-[0.7rem] uppercase tracking-[0.15em] text-muted-warm mb-2">
        something went wrong
      </p>
      <p className="text-[0.95rem] text-ink mb-4">
        We couldn&rsquo;t load your portal. Try reloading.
      </p>
      <p className="text-[0.75rem] text-muted-warm mb-6 font-mono">
        {error.message}
      </p>
      <Button onClick={reset} size="sm">
        retry
      </Button>
    </div>
  )
}
