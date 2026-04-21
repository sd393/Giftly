import { z } from 'zod'

export const API_SCOPES = [
  'brands:read',
  'brands:write',
  'creators:read',
  'creators:write',
  'outbound:read',
  'outbound:write',
] as const

export type ApiScope = (typeof API_SCOPES)[number]

export const createTokenSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, 'Label is required')
    .max(120, 'Label is too long'),
  scopes: z
    .array(z.enum(API_SCOPES))
    .min(1, 'Pick at least one scope'),
})

export type CreateTokenInput = z.infer<typeof createTokenSchema>
