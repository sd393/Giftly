'use client'

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import type { CreatorVideo } from '../lib/types'

export function VideoModal({
  open,
  onOpenChange,
  video,
}: {
  open: boolean
  onOpenChange: (next: boolean) => void
  video: CreatorVideo | null
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-black border-zinc-800 p-0 overflow-hidden">
        <DialogTitle className="sr-only">
          Creator video — {video?.handle ?? ''}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Captured creator content used to compute this product&rsquo;s Giftly
          signal.
        </DialogDescription>
        {video && (
          <div className="relative">
            <video
              key={video.video_url}
              src={video.video_url}
              poster={video.thumbnail_url}
              autoPlay
              loop
              muted
              playsInline
              controls
              className="block aspect-[9/16] w-full bg-black"
            />
            <div className="absolute left-3 bottom-3 right-3 flex items-center gap-2 text-white">
              <span className="text-[11px] uppercase tracking-wider opacity-80">
                {video.platform}
              </span>
              <span className="text-[13px] font-medium">{video.handle}</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
