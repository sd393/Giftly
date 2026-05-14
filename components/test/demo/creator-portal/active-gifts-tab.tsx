import { Badge } from '@/components/ui/badge'

import { ACTIVE_GIFT } from '../lib/mock-data'

export function ActiveGiftsTab() {
  return (
    <div className="space-y-4">
      <header>
        <div className="flex items-center gap-2 mb-1">
          <Badge className="text-[0.65rem] uppercase tracking-[0.1em]">
            posted
          </Badge>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded border text-[0.7rem] font-mono uppercase tracking-[0.08em] text-emerald-700 border-emerald-300 bg-emerald-50">
            positive
          </span>
          <span className="text-[0.75rem] text-muted-warm">
            from {ACTIVE_GIFT.brandName}
          </span>
        </div>
        <h3 className="font-display text-[1.25rem] tracking-tight">
          Your post — {ACTIVE_GIFT.productName}
        </h3>
      </header>

      <div className="rounded-md overflow-hidden border border-line/60 bg-black">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          src="/demo/creator-sample-video.mov"
          controls
          playsInline
          preload="metadata"
          className="w-full h-auto max-h-[70vh] object-contain bg-black"
        />
      </div>
    </div>
  )
}
