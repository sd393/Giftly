'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { submitCreatorForm } from '@/app/actions/submit-creator'
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
import { cn } from '@/lib/utils'
import {
  creatorFormSchema,
  type CreatorFormValues,
} from '@/lib/schemas/creator'

const NICHE_OPTIONS = [
  'beauty',
  'skincare',
  'fashion',
  'fitness',
  'wellness',
  'food',
  'home',
  'lifestyle',
  'pets',
  'parenting',
  'tech',
  'other',
]

export function CreatorForm() {
  const [submitted, setSubmitted] = useState(false)

  const form = useForm<CreatorFormValues>({
    resolver: zodResolver(creatorFormSchema),
    defaultValues: {
      name: '',
      email: '',
      socialHandles: '',
      platform: '',
      followers: '',
      niches: [],
      productInterests: '',
      contentLink: '',
      shippingAddress: '',
    },
  })

  const { isSubmitting } = form.formState
  const niches = form.watch('niches')

  const toggleNiche = (n: string) => {
    const current = form.getValues('niches')
    const next = current.includes(n)
      ? current.filter((x) => x !== n)
      : [...current, n]
    form.setValue('niches', next, { shouldValidate: true, shouldDirty: true })
  }

  async function onSubmit(data: CreatorFormValues) {
    const result = await submitCreatorForm(data)
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
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="your full name"
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
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="you@example.com"
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
            name="socialHandles"
            render={({ field }) => (
              <FormItem>
                <FormLabel>social handles</FormLabel>
                <FormControl>
                  <Input
                    placeholder="@yourhandle on ig, @yourhandle on tt, etc."
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
              name="platform"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>primary platform</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. instagram + tiktok"
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
              name="followers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>approximate followers</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. 12k ig / 40k tt"
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
            name="niches"
            render={() => (
              <FormItem>
                <FormLabel>niches</FormLabel>
                <FormControl>
                  <div className="flex flex-wrap gap-2">
                    {NICHE_OPTIONS.map((n) => {
                      const active = niches.includes(n)
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => toggleNiche(n)}
                          disabled={isSubmitting}
                          className={cn(
                            'text-xs tracking-[0.14em] uppercase font-medium px-3.5 py-2 rounded-full border transition-all',
                            active
                              ? 'bg-coral text-white border-coral'
                              : 'bg-transparent text-ink border-line hover:border-coral hover:text-coral'
                          )}
                        >
                          {n}
                        </button>
                      )
                    })}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="productInterests"
            render={({ field }) => (
              <FormItem>
                <FormLabel>what products would you love to get?</FormLabel>
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

          <FormField
            control={form.control}
            name="contentLink"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  link to content you&rsquo;re proud of
                  <span className="ml-1 text-muted-warm font-normal">
                    (optional)
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="url"
                    placeholder="https://instagram.com/p/..."
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
            name="shippingAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  shipping address
                  <span className="ml-1 text-muted-warm font-normal">
                    (optional)
                  </span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="street, city, state, zip"
                    rows={3}
                    disabled={isSubmitting}
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
              'apply as a creator'
            )}
          </Button>
        </form>
      </Form>
    </div>
  )
}
