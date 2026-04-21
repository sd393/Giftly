'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BRAND_STAGES, type BrandStage } from '@/lib/schemas/brand'

import { setBrandStage } from '../_actions'

const LABELS: Record<BrandStage, string> = {
  cold: 'cold',
  in_talks: 'in talks',
  done: 'done',
}

export function BrandStageSelect({
  id,
  initial,
}: {
  id: string
  initial: BrandStage
}) {
  const [pending, startTransition] = useTransition()

  function handleChange(next: string) {
    const stage = next as BrandStage
    if (stage === initial) return
    startTransition(async () => {
      const result = await setBrandStage(id, stage)
      if (!result.success) toast.error(result.error ?? 'failed')
      else toast.success(`stage set to ${LABELS[stage]}`)
    })
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[0.7rem] uppercase tracking-[0.1em] text-muted-warm">
        stage
      </span>
      <Select
        value={initial}
        onValueChange={handleChange}
        disabled={pending}
      >
        <SelectTrigger className="h-8 w-28 text-[0.8rem]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {BRAND_STAGES.map((s) => (
            <SelectItem key={s} value={s}>
              {LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
