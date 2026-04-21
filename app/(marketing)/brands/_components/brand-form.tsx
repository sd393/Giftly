'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, CheckCircle2, Check, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { submitBrandForm } from '@/app/actions/submit-brand'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { brandFormSchema, type BrandFormValues } from '@/lib/schemas/brand'

const CATEGORY_SUGGESTIONS = [
  'beauty',
  'skincare',
  'supplements',
  'wellness',
  'apparel',
  'home',
  'food & beverage',
  'pet',
  'baby',
  'fitness',
]

export function BrandForm() {
  const [submitted, setSubmitted] = useState(false)

  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandFormSchema),
    defaultValues: {
      contactName: '',
      contactRole: '',
      contactEmail: '',
      brandName: '',
      website: '',
      category: '',
      productDescription: '',
    },
  })

  const { isSubmitting } = form.formState

  async function onSubmit(data: BrandFormValues) {
    const result = await submitBrandForm(data)
    if (result.success) {
      setSubmitted(true)
    } else {
      toast.error(result.error ?? 'Something went wrong. Please try again.')
    }
  }

  if (submitted) {
    return (
      <div className="bg-white/90 backdrop-blur-xl p-8 md:p-12 text-center">
        <div className="flex justify-center">
          <CheckCircle2 className="h-10 w-10 text-coral" />
        </div>
        <p className="mt-6 font-display italic text-[clamp(1.5rem,3vw,2.25rem)] leading-[1.2] tracking-tight">
          thanks. we&rsquo;ll be in touch.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-muted-warm hover:text-coral transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          back to home
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white/90 backdrop-blur-xl p-7 md:p-10">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormField
              control={form.control}
              name="contactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>your name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="full name"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactRole"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    your role
                    <span className="ml-1 text-muted-warm font-normal">
                      (optional)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. founder, head of growth"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="contactEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>work email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="you@brand.com"
                    disabled={isSubmitting}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormField
              control={form.control}
              name="brandName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>brand name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="your brand"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>website</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://yourbrand.com"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>category</FormLabel>
                <FormControl>
                  <CategoryCombobox
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="productDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  what&rsquo;s the product you want creators posting about?
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="2–3 sentences"
                    disabled={isSubmitting}
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            variant="coral"
            size="default"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                submitting...
              </>
            ) : (
              'apply as a brand'
            )}
          </Button>
        </form>
      </Form>
    </div>
  )
}

function CategoryCombobox({
  value,
  onChange,
  onBlur,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  onBlur: () => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const query = value.trim().toLowerCase()
  const filtered = query
    ? CATEGORY_SUGGESTIONS.filter((c) => c.toLowerCase().includes(query))
    : CATEGORY_SUGGESTIONS

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const select = (c: string) => {
    onChange(c)
    setOpen(false)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        placeholder="beauty, skincare, etc."
        disabled={disabled}
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
          setHighlight(0)
        }}
        onBlur={onBlur}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
            setHighlight((h) => Math.min(h + 1, filtered.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlight((h) => Math.max(h - 1, 0))
          } else if (e.key === 'Enter') {
            if (open && filtered[highlight]) {
              e.preventDefault()
              select(filtered[highlight])
            }
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {open && filtered.length > 0 ? (
        <ul
          role="listbox"
          className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-line shadow-[0_12px_32px_-12px_rgba(42,26,18,0.2)] max-h-60 overflow-y-auto"
        >
          {filtered.map((c, i) => {
            const active = i === highlight
            const selected = value.trim().toLowerCase() === c.toLowerCase()
            return (
              <li
                key={c}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => {
                  e.preventDefault()
                  select(c)
                }}
                className={`flex items-center justify-between px-3.5 py-2 text-sm cursor-pointer transition-colors ${
                  active
                    ? 'bg-cream-warm text-coral'
                    : 'text-ink hover:bg-cream-warm hover:text-coral'
                }`}
              >
                <span>{c}</span>
                {selected ? (
                  <Check className="h-4 w-4 text-coral" aria-hidden="true" />
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
