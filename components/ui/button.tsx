import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans font-medium rounded-full transition-all duration-200 cursor-pointer disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral aria-invalid:ring-2 aria-invalid:ring-destructive/40",
  {
    variants: {
      variant: {
        primary:
          'bg-ink text-cream hover:bg-coral hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-10px_rgba(229,90,78,0.5)]',
        secondary:
          'bg-transparent text-ink border border-ink hover:bg-ink hover:text-cream hover:-translate-y-0.5',
        ghost: 'bg-transparent text-ink hover:text-coral',
        coral: 'bg-coral text-cream hover:bg-coral-deep',
        'on-coral': 'bg-cream text-coral-deep hover:bg-ink hover:text-cream',
        'on-ink': 'bg-cream text-ink hover:bg-coral hover:text-cream',
        // Legacy variants retained so shadcn internals type-check.
        outline: 'border border-border bg-background text-foreground hover:bg-muted',
        destructive: 'bg-destructive text-white hover:bg-destructive/90',
        link: 'text-coral underline-offset-4 hover:underline',
      },
      size: {
        default: 'px-7 py-4 text-[0.98rem]',
        sm: 'px-4 py-2 text-sm',
        pill: 'px-[1.1rem] py-2 text-[0.95rem]',
        icon: 'size-9 p-0',
        'icon-sm': 'size-8 p-0',
        'icon-lg': 'size-10 p-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
