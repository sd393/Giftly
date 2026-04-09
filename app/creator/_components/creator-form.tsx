"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

import {
  creatorFormSchema,
  type CreatorFormValues,
} from "@/lib/schemas/creator"
import { submitCreatorForm } from "@/app/actions/submit-creator"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

export function CreatorForm() {
  const [submitted, setSubmitted] = useState(false)

  const form = useForm<CreatorFormValues>({
    resolver: zodResolver(creatorFormSchema),
    defaultValues: {
      email: "",
      instagramHandle: "",
      tiktokHandle: "",
      shippingAddress: "",
      productInterests: "",
      contentLink: "",
    },
  })

  const { isSubmitting } = form.formState

  async function onSubmit(data: CreatorFormValues) {
    const result = await submitCreatorForm(data)
    if (result.success) {
      setSubmitted(true)
    } else {
      toast.error(result.error ?? "Something went wrong. Please try again.")
    }
  }

  if (submitted) {
    return (
      <section className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <div className="flex justify-center">
            <CheckCircle2 className="h-12 w-12 text-primary" />
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Application received.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            We&apos;ll review your details and be in touch soon.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="mt-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Join Giftly as a Creator
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Tell us about yourself and we&apos;ll match you with brands you&apos;ll love.
          </p>
        </div>

        <Card className="mt-10">
          <CardHeader>
            <CardTitle>Creator Application</CardTitle>
            <CardDescription>
              Fill out the form below. Only email is required — everything else helps us find better matches for you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
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
                  name="instagramHandle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instagram Handle</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="@yourhandle"
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
                  name="tiktokHandle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>TikTok Handle</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="@yourhandle"
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
                      <FormLabel>Shipping Address</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Street, City, State, ZIP"
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
                  name="productInterests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        What are some products you&apos;d like to try?
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Skincare, fitness gear, tech accessories..."
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
                  name="contentLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Link to a recent post that shows your content style
                        <span className="ml-1 text-muted-foreground font-normal">
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

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Apply Now"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
