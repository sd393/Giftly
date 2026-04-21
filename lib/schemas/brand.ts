import { z } from 'zod'

/**
 * Normalize a site URL/domain to its canonical root domain.
 * Strips protocol, leading `www.`, paths, query strings, and trailing slashes.
 */
export function normalizeRootDomain(input: string): string {
  const trimmed = input.trim().toLowerCase()
  if (!trimmed) return trimmed

  let host = trimmed
    .replace(/^https?:\/\//, '')
    .replace(/^\/\//, '')
    .replace(/^www\./, '')

  const slash = host.indexOf('/')
  if (slash !== -1) host = host.slice(0, slash)

  const query = host.indexOf('?')
  if (query !== -1) host = host.slice(0, query)

  return host.replace(/\.+$/, '')
}

export const brandFormSchema = z.object({
  contactName: z
    .string()
    .trim()
    .min(1, 'Your name is required')
    .max(120, 'Name is too long'),
  contactRole: z
    .string()
    .trim()
    .max(120, 'Role is too long')
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  contactEmail: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Work email is required')
    .email('Please enter a valid email address')
    .max(320, 'Email is too long'),
  brandName: z
    .string()
    .trim()
    .min(1, 'Brand name is required')
    .max(160, 'Brand name is too long'),
  website: z
    .string()
    .trim()
    .min(1, 'Website is required')
    .max(500, 'Website is too long')
    .transform((v, ctx) => {
      const root = normalizeRootDomain(v)
      if (!root || !root.includes('.')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please enter a valid website',
        })
        return z.NEVER
      }
      return root
    }),
  category: z
    .string()
    .trim()
    .max(120, 'Category is too long')
    .optional()
    .transform((v) => (v && v.length > 0 ? v.toLowerCase() : undefined)),
  productDescription: z
    .string()
    .trim()
    .min(1, 'Tell us about the product')
    .max(2000, 'Please keep this under 2000 characters'),
})

export type BrandFormValues = z.infer<typeof brandFormSchema>

export const BRAND_STAGES = ['cold', 'in_talks', 'done'] as const
export type BrandStage = (typeof BRAND_STAGES)[number]

export const brandStageSchema = z.object({
  stage: z.enum(BRAND_STAGES),
})

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} is too long`)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined))

/**
 * Internal-platform brand edit schema. Relaxed vs the public application:
 * contactRole, category, productDescription are all optional and notes +
 * ownerId are editable.
 */
export const brandEditSchema = z.object({
  contactName: z
    .string()
    .trim()
    .min(1, 'Contact name is required')
    .max(120, 'Name is too long'),
  contactRole: optionalText(120, 'Role'),
  contactEmail: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Contact email is required')
    .email('Please enter a valid email address')
    .max(320, 'Email is too long'),
  brandName: z
    .string()
    .trim()
    .min(1, 'Brand name is required')
    .max(160, 'Brand name is too long'),
  website: z
    .string()
    .trim()
    .min(1, 'Website is required')
    .max(500, 'Website is too long')
    .transform((v, ctx) => {
      const root = normalizeRootDomain(v)
      if (!root || !root.includes('.')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please enter a valid website',
        })
        return z.NEVER
      }
      return root
    }),
  category: z
    .string()
    .trim()
    .max(120, 'Category is too long')
    .optional()
    .transform((v) => (v && v.length > 0 ? v.toLowerCase() : undefined)),
  productDescription: optionalText(2000, 'Product description'),
  notes: optionalText(5000, 'Notes'),
  ownerId: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .transform((v) => (v ? v : null)),
  stage: z.enum(BRAND_STAGES).optional(),
})

export type BrandEditValues = z.infer<typeof brandEditSchema>
