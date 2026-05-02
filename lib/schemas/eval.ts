import { z } from 'zod'

export const ExtractedEvalSchema = z.object({
  // Video-native fields. Gemini fills these from the video itself, not
  // from a separate transcript pre-pass. `transcript` is the spoken
  // audio transcribed as a side-product of the multimodal pass; we
  // also mirror it onto `eval_videos.transcript` for keyword scans.
  transcript: z.string().nullable(),
  visual_observations: z.array(z.string()).default([]),
  demonstrated_use_cases: z.array(z.string()).default([]),

  would_keep_using: z.enum(['yes', 'sometimes', 'no']).nullable(),
  worth_the_price: z.enum(['yes', 'maybe_at_discount', 'no']).nullable(),
  best_for: z.array(z.string()).default([]),
  not_for: z.array(z.string()).default([]),
  one_line_take: z.string().nullable(),
  sentiment: z.enum(['positive', 'mixed', 'negative']).nullable(),
  raw_quotes: z.array(z.string()).default([]),
})

export type ExtractedEval = z.infer<typeof ExtractedEvalSchema>

export const EXTRACTION_PROMPT = `You are extracting structured evaluation data from a creator's video review of a product. The input is the full video — both the spoken audio AND the visuals (how they hold the product, packaging, facial reactions, gestures, room/setting context, demonstrated use cases). Use both signals.

Return JSON matching the schema exactly. Only fill fields that are actually present in the video — use null (or empty array for list fields) for anything the creator did not address. Do not infer or guess.

Field semantics:
- transcript: verbatim spoken audio from the creator. Include ums, false starts. Null only if the video has no spoken content.
- visual_observations: things you see in the video that aren't spoken — packaging shots, how they hold the product, facial expressions, gestures, room/setting context, what's on screen alongside the product. One short observation per array entry.
- demonstrated_use_cases: ways the creator actually USED the product on camera (not just mentioned). One use case per entry.
- would_keep_using / worth_the_price / sentiment: the creator's stance, drawn from spoken AND visual cues (e.g. visible enthusiasm, reluctance).
- best_for / not_for: audience or use-case fits the creator names.
- one_line_take: one sentence summarizing their overall verdict, in your words.
- raw_quotes: direct quotes from the spoken audio that capture the creator's stance.

Schema:
{
  "transcript": string | null,
  "visual_observations": string[],
  "demonstrated_use_cases": string[],
  "would_keep_using": "yes" | "sometimes" | "no" | null,
  "worth_the_price": "yes" | "maybe_at_discount" | "no" | null,
  "best_for": string[],
  "not_for": string[],
  "one_line_take": string | null,
  "sentiment": "positive" | "mixed" | "negative" | null,
  "raw_quotes": string[]
}
`
