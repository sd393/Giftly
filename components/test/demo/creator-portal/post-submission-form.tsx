'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const CONTENT_TYPES = [
  'Instagram Reel',
  'Instagram Carousel',
  'Instagram Story',
  'TikTok video',
  'YouTube Short',
  'Long-form review',
]

export function PostSubmissionForm({
  postUrl,
  contentType,
  scheduledDate,
  onChange,
}: {
  postUrl: string
  contentType: string
  scheduledDate: string
  onChange: (next: {
    postUrl?: string
    contentType?: string
    scheduledDate?: string
  }) => void
}) {
  return (
    <div className="mt-4 border-t border-line/60 pt-4 space-y-4">
      <p className="text-[0.7rem] uppercase tracking-[0.15em] text-muted-warm font-medium">
        love it · let&rsquo;s line up the post
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="post-url" className="text-[0.8rem]">
            post URL (or planned URL)
          </Label>
          <Input
            id="post-url"
            type="url"
            value={postUrl}
            onChange={(e) => onChange({ postUrl: e.target.value })}
            placeholder="https://instagram.com/p/..."
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="content-type" className="text-[0.8rem]">
            content type
          </Label>
          <Select
            value={contentType}
            onValueChange={(v) => onChange({ contentType: v })}
          >
            <SelectTrigger id="content-type" className="mt-1.5">
              <SelectValue placeholder="pick a format" />
            </SelectTrigger>
            <SelectContent>
              {CONTENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="scheduled-date" className="text-[0.8rem]">
            scheduled post date
          </Label>
          <Input
            id="scheduled-date"
            type="date"
            value={scheduledDate}
            onChange={(e) => onChange({ scheduledDate: e.target.value })}
            className="mt-1.5"
          />
        </div>
      </div>

      <p className="text-[0.75rem] text-muted-warm">
        Affiliate link will be generated automatically once your post date is
        confirmed. You earn 15% on every tracked sale.
      </p>
    </div>
  )
}
