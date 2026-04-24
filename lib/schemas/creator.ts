import { z } from 'zod'

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} is too long`)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined))

const requiredText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} is too long`)

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .max(320, 'Email is too long')

const contentLinkSchema = z
  .string()
  .trim()
  .url('Please enter a valid URL')
  .max(500, 'URL is too long')
  .optional()
  .or(z.literal(''))
  .transform((v) => (v && v.length > 0 ? v : undefined))

export const creatorFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(120, 'Name is too long'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(320, 'Email is too long'),
  socialHandles: optionalText(240, 'Social handles'),
  platform: optionalText(120, 'Platform'),
  followers: optionalText(120, 'Followers'),
  niches: z
    .array(z.string().trim().min(1).max(60))
    .min(1, 'Pick at least one niche')
    .max(12, 'Pick up to 12 niches'),
  productInterests: z
    .string()
    .trim()
    .min(1, 'Tell us what products you’d like to try')
    .max(2000, 'Please keep this under 2000 characters'),
  contentLink: z
    .string()
    .trim()
    .url('Please enter a valid URL')
    .max(500, 'URL is too long')
    .optional()
    .or(z.literal(''))
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  shippingAddress: optionalText(500, 'Shipping address'),
})

export type CreatorFormValues = z.infer<typeof creatorFormSchema>

/**
 * Internal-platform edit schema. Looser than the public form: niches and
 * product-interests are optional, notes + owner may be set. Used by the
 * creator detail edit form and the "+ new creator" manual-entry flow.
 */
export const creatorEditSchema = z.object({
  name: requiredText(120, 'Name'),
  email: emailSchema,
  socialHandles: optionalText(240, 'Social handles'),
  platform: optionalText(120, 'Platform'),
  followers: optionalText(120, 'Followers'),
  niches: z
    .array(z.string().trim().min(1).max(60))
    .max(12, 'Pick up to 12 niches')
    .default([]),
  productInterests: optionalText(2000, 'Product interests'),
  contentLink: contentLinkSchema,
  shippingAddress: optionalText(500, 'Shipping address'),
  notes: optionalText(5000, 'Notes'),
  ownerId: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .transform((v) => (v ? v : null)),
})

export type CreatorEditValues = z.infer<typeof creatorEditSchema>
