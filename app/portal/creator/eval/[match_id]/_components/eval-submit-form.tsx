'use client'

import { useRouter } from 'next/navigation'
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { submitEval } from '../../../_actions'

const ACCEPT_MIME = 'video/mp4,video/quicktime,video/webm'
const ALLOWED_MIMES = ['video/mp4', 'video/quicktime', 'video/webm']
const MAX_BYTES = 100 * 1024 * 1024

type Sentiment = 'positive' | 'negative'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function EvalSubmitForm({ matchId }: { matchId: string }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [sentiment, setSentiment] = useState<Sentiment | null>(null)
  const [pending, startTransition] = useTransition()

  // Revoke blob URL on unmount or when re-picking.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.files?.[0] ?? null
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    if (!next) {
      setFile(null)
      setPreviewUrl(null)
      return
    }
    if (next.type && !ALLOWED_MIMES.includes(next.type)) {
      toast.error('That file type isn’t supported. Use MP4, MOV, or WebM.')
      e.target.value = ''
      setFile(null)
      setPreviewUrl(null)
      return
    }
    if (next.size > MAX_BYTES) {
      toast.error('That file is over the 100 MB limit.')
      e.target.value = ''
      setFile(null)
      setPreviewUrl(null)
      return
    }
    setFile(next)
    setPreviewUrl(URL.createObjectURL(next))
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!sentiment) {
      toast.error('Pick positive or negative first.')
      return
    }
    if (!file) {
      toast.error('Pick a video first.')
      return
    }
    startTransition(async () => {
      const fd = new FormData()
      fd.set('matchId', matchId)
      fd.set('file', file)
      fd.set('creator_stated_sentiment', sentiment)
      const r = await submitEval(fd)
      if (r.ok) {
        toast.success('Eval received. Thanks for the honest take.')
        router.push('/portal/creator?eval=submitted')
      } else {
        toast.error(r.error ?? 'Something went wrong.')
      }
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-line/60 rounded-md bg-white p-5 md:p-6"
    >
      <p className="text-[0.7rem] uppercase tracking-[0.15em] text-muted-warm font-medium mb-3">
        how do you feel about this product?
      </p>
      {/*
        UX-INTENT: equal-weight pair. Both buttons share sizing/typography so
        we don't bias the creator toward "positive". Selected state matches
        the active-gift-card "still trying" highlight (coral border + coral
        tint) so the visual language stays consistent across the portal.
      */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          size="default"
          disabled={pending}
          aria-pressed={sentiment === 'positive'}
          onClick={() => setSentiment('positive')}
          className={cn(
            'w-full h-auto py-4 px-4 flex items-center justify-center gap-2 text-center text-[0.9rem] font-medium leading-tight rounded-md',
            'bg-white border border-line/60 text-ink hover:bg-cream-warm hover:text-ink hover:-translate-y-0',
            sentiment === 'positive' && 'border-coral/40 bg-coral/5 ring-2 ring-coral/30',
          )}
        >
          <ThumbsUp aria-hidden="true" className="size-5 text-ink-soft" />
          <span>Positive</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="default"
          disabled={pending}
          aria-pressed={sentiment === 'negative'}
          onClick={() => setSentiment('negative')}
          className={cn(
            'w-full h-auto py-4 px-4 flex items-center justify-center gap-2 text-center text-[0.9rem] font-medium leading-tight rounded-md',
            'bg-white border border-line/60 text-ink hover:bg-cream-warm hover:text-ink hover:-translate-y-0',
            sentiment === 'negative' && 'border-coral/40 bg-coral/5 ring-2 ring-coral/30',
          )}
        >
          <ThumbsDown aria-hidden="true" className="size-5 text-ink-soft" />
          <span>Negative</span>
        </Button>
      </div>

      <div className="mt-6">
        <p className="text-[0.7rem] uppercase tracking-[0.15em] text-muted-warm font-medium mb-2">
          upload your video
        </p>
        <p className="text-[0.85rem] text-ink-soft leading-[1.55] mb-4">
          MP4, MOV, or WebM. 100 MB max. On mobile your camera should open
          directly.
        </p>

        <input
          ref={inputRef}
          type="file"
          name="file"
          accept={ACCEPT_MIME}
          capture="user"
          onChange={handleFileChange}
          disabled={pending}
          className="block w-full text-[0.9rem] text-ink file:mr-4 file:rounded-full file:border-0 file:bg-ink file:text-cream file:px-4 file:py-2 file:text-sm file:font-medium file:cursor-pointer hover:file:bg-coral disabled:opacity-50"
        />

        {file && previewUrl ? (
          <div className="mt-5">
            <p className="text-[0.7rem] uppercase tracking-[0.15em] text-muted-warm font-medium mb-2">
              preview
            </p>
            <video
              controls
              src={previewUrl}
              className="w-full rounded-md bg-black"
            />
            <p className="mt-2 text-[0.75rem] text-muted-warm">
              {file.name} · {formatBytes(file.size)}
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex items-center gap-2">
        <Button
          type="submit"
          size="sm"
          variant="coral"
          disabled={pending || !file || !sentiment}
        >
          {pending ? 'Uploading…' : 'Submit eval'}
        </Button>
      </div>
    </form>
  )
}
