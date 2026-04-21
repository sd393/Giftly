'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { brandEditSchema, type BrandEditValues } from '@/lib/schemas/brand'

import { createBrand } from '../_actions'

export function NewBrandForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BrandEditValues>({
    resolver: zodResolver(brandEditSchema),
    defaultValues: {
      brandName: '',
      website: '',
      contactName: '',
      contactEmail: '',
    },
  })

  function onSubmit(values: BrandEditValues) {
    startTransition(async () => {
      const result = await createBrand(values)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      router.push(`/brands/${result.data.id}`)
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="brand name" error={errors.brandName?.message}>
          <Input {...register('brandName')} autoFocus />
        </Field>
        <Field label="website" error={errors.website?.message}>
          <Input {...register('website')} placeholder="brand.com" />
        </Field>
        <Field label="category" error={errors.category?.message}>
          <Input {...register('category')} />
        </Field>
        <div />
        <Field label="contact name" error={errors.contactName?.message}>
          <Input {...register('contactName')} />
        </Field>
        <Field label="contact role" error={errors.contactRole?.message}>
          <Input {...register('contactRole')} />
        </Field>
        <Field label="contact email" error={errors.contactEmail?.message}>
          <Input type="email" {...register('contactEmail')} />
        </Field>
      </div>

      <Field label="product description" error={errors.productDescription?.message}>
        <Textarea rows={3} {...register('productDescription')} />
      </Field>

      <Field label="initial notes" error={errors.notes?.message}>
        <Textarea rows={3} {...register('notes')} />
      </Field>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? 'creating…' : 'create brand'}
        </Button>
        <button
          type="button"
          onClick={() => router.push('/brands')}
          className="text-[0.8rem] text-muted-warm hover:text-ink"
        >
          cancel
        </button>
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
