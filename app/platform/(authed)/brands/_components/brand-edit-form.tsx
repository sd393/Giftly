'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { brandEditSchema, type BrandEditValues } from '@/lib/schemas/brand'
import type { Database } from '@/lib/supabase/types'

import { updateBrand } from '../_actions'

type Brand = Database['public']['Tables']['brands']['Row']

export function BrandEditForm({ brand }: { brand: Brand }) {
  const [pending, startTransition] = useTransition()
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<BrandEditValues>({
    resolver: zodResolver(brandEditSchema),
    defaultValues: {
      contactName: brand.contact_name,
      contactRole: brand.contact_role ?? undefined,
      contactEmail: brand.contact_email,
      brandName: brand.brand_name,
      website: brand.website,
      category: brand.category ?? undefined,
      productDescription: brand.product_description ?? undefined,
      notes: brand.notes ?? undefined,
      ownerId: brand.owner_id,
    },
  })

  function onSubmit(values: BrandEditValues) {
    startTransition(async () => {
      const result = await updateBrand(brand.id, values)
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
        <Field label="brand name" error={errors.brandName?.message}>
          <Input {...register('brandName')} />
        </Field>
        <Field label="website" error={errors.website?.message}>
          <Input {...register('website')} placeholder="brand.com" />
        </Field>
        <Field label="category" error={errors.category?.message}>
          <Input {...register('category')} placeholder="skincare, supplements…" />
        </Field>
        <div />
        <Field label="contact name" error={errors.contactName?.message}>
          <Input {...register('contactName')} />
        </Field>
        <Field label="contact role" error={errors.contactRole?.message}>
          <Input {...register('contactRole')} placeholder="founder, head of marketing…" />
        </Field>
        <Field label="contact email" error={errors.contactEmail?.message}>
          <Input type="email" {...register('contactEmail')} />
        </Field>
      </div>

      <Field label="product description" error={errors.productDescription?.message}>
        <Textarea rows={4} {...register('productDescription')} />
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
