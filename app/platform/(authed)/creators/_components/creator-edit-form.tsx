'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  creatorEditSchema,
  type CreatorEditValues,
} from '@/lib/schemas/creator'
import type { Database } from '@/lib/supabase/types'

import { updateCreator } from '../_actions'

type Creator = Database['public']['Tables']['creators']['Row']

export function CreatorEditForm({ creator }: { creator: Creator }) {
  const [pending, startTransition] = useTransition()
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
    reset,
  } = useForm<CreatorEditValues>({
    resolver: zodResolver(creatorEditSchema),
    defaultValues: {
      name: creator.name,
      email: creator.email,
      socialHandles: creator.social_handles ?? undefined,
      platform: creator.platform ?? undefined,
      followers: creator.followers ?? undefined,
      niches: creator.niches ?? [],
      productInterests: creator.product_interests ?? undefined,
      contentLink: creator.content_link ?? undefined,
      notes: creator.notes ?? undefined,
      ownerId: creator.owner_id,
    },
  })

  const nichesValue = watch('niches') ?? []

  function onSubmit(values: CreatorEditValues) {
    startTransition(async () => {
      const result = await updateCreator(creator.id, values)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success('saved')
      reset(values)
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="name" error={errors.name?.message}>
          <Input {...register('name')} />
        </Field>
        <Field label="email" error={errors.email?.message}>
          <Input type="email" {...register('email')} />
        </Field>
        <Field label="social handles" error={errors.socialHandles?.message}>
          <Input {...register('socialHandles')} placeholder="@handle, @other" />
        </Field>
        <Field label="primary platform" error={errors.platform?.message}>
          <Input {...register('platform')} placeholder="instagram, tiktok…" />
        </Field>
        <Field label="followers" error={errors.followers?.message}>
          <Input {...register('followers')} placeholder="e.g. 15k" />
        </Field>
        <Field label="content link" error={errors.contentLink?.message}>
          <Input type="url" {...register('contentLink')} />
        </Field>
      </div>

      <Field label="niches" error={errors.niches?.message}>
        <NichesInput
          value={nichesValue}
          onChange={(n) => setValue('niches', n, { shouldDirty: true })}
        />
      </Field>

      <Field label="product interests" error={errors.productInterests?.message}>
        <Textarea rows={4} {...register('productInterests')} />
      </Field>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" size="sm" disabled={pending || !isDirty}>
          {pending ? 'saving…' : 'save changes'}
        </Button>
        {isDirty ? (
          <button
            type="button"
            onClick={() => reset()}
            className="text-[0.8rem] text-muted-warm hover:text-ink"
          >
            discard
          </button>
        ) : null}
      </div>
    </form>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[0.75rem] uppercase tracking-[0.08em] text-muted-warm">
        {label}
      </Label>
      {children}
      {error ? (
        <p className="text-[0.75rem] text-coral-deep">{error}</p>
      ) : null}
    </div>
  )
}

function NichesInput({
  value,
  onChange,
}: {
  value: string[]
  onChange: (next: string[]) => void
}) {
  function add(raw: string) {
    const clean = raw.trim().toLowerCase()
    if (!clean || value.includes(clean)) return
    onChange([...value, clean])
  }
  function remove(n: string) {
    onChange(value.filter((v) => v !== n))
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-line/60 bg-white px-2 py-1.5 min-h-9">
      {value.map((n) => (
        <span
          key={n}
          className="inline-flex items-center gap-1 rounded-full bg-cream-warm px-2 py-0.5 text-[0.75rem]"
        >
          {n}
          <button
            type="button"
            onClick={() => remove(n)}
            aria-label={`remove ${n}`}
            className="text-muted-warm hover:text-ink"
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        placeholder={value.length === 0 ? 'add niche, press enter' : ''}
        className="flex-1 min-w-[8rem] bg-transparent text-[0.85rem] outline-none py-1"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            const input = e.currentTarget
            add(input.value)
            input.value = ''
          } else if (
            e.key === 'Backspace' &&
            e.currentTarget.value === '' &&
            value.length > 0
          ) {
            remove(value[value.length - 1])
          }
        }}
        onBlur={(e) => {
          if (e.target.value.trim()) {
            add(e.target.value)
            e.target.value = ''
          }
        }}
      />
    </div>
  )
}
