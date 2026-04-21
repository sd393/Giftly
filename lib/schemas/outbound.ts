import { z } from 'zod'

export const MESSAGE_DIRECTIONS = ['outbound', 'inbound'] as const
export const MESSAGE_STATUSES = [
  'sent',
  'delivered',
  'replied',
  'bounced',
  'failed',
] as const
export const TASK_STATUSES = [
  'todo',
  'in_progress',
  'waiting',
  'done',
  'dropped',
] as const
export const ENTITY_TYPES = ['creator', 'brand'] as const

export const outboundMessageSchema = z.object({
  entityType: z.enum(ENTITY_TYPES),
  entityId: z.string().uuid('Select a brand or creator'),
  channel: z
    .string()
    .trim()
    .min(1, 'Channel is required')
    .max(60, 'Channel is too long')
    .toLowerCase(),
  direction: z.enum(MESSAGE_DIRECTIONS).default('outbound'),
  subject: z
    .string()
    .trim()
    .max(250, 'Subject is too long')
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  body: z
    .string()
    .trim()
    .min(1, 'Body is required')
    .max(20000, 'Body is too long'),
  senderAccount: z
    .string()
    .trim()
    .max(250, 'Sender account is too long')
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  status: z.enum(MESSAGE_STATUSES).default('sent'),
  sentAt: z
    .string()
    .datetime({ message: 'Invalid sent_at' })
    .optional(),
  externalId: z
    .string()
    .trim()
    .max(250)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
})

export type OutboundMessageInput = z.infer<typeof outboundMessageSchema>
