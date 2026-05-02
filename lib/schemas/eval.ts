import { z } from 'zod'

export const ExtractedEvalSchema = z.object({
  would_keep_using: z.enum(['yes', 'sometimes', 'no']).nullable(),
  worth_the_price: z.enum(['yes', 'maybe_at_discount', 'no']).nullable(),
  best_for: z.array(z.string()).default([]),
  not_for: z.array(z.string()).default([]),
  one_line_take: z.string().nullable(),
  sentiment: z.enum(['positive', 'mixed', 'negative']).nullable(),
  raw_quotes: z.array(z.string()).default([]),
})

export type ExtractedEval = z.infer<typeof ExtractedEvalSchema>

export const EXTRACTION_PROMPT = `You are extracting structured evaluation data from a creator's video review of a product. Below is the transcript. Extract the following fields. Return JSON matching the schema exactly. Use null for fields the creator did not address — do not infer.

Schema:
{
  "would_keep_using": "yes" | "sometimes" | "no" | null,
  "worth_the_price": "yes" | "maybe_at_discount" | "no" | null,
  "best_for": string[],
  "not_for": string[],
  "one_line_take": string | null,
  "sentiment": "positive" | "mixed" | "negative" | null,
  "raw_quotes": string[]
}

Transcript:
{transcript}
`
