import { z } from 'zod'

export const ExtractedEvalSchema = z.object({
  // Multimodal fields. The provider transcribes spoken audio with
  // Whisper, extracts keyframes with ffmpeg, then asks GPT-4o vision
  // to fill the structured fields from both signals. The provider
  // injects the Whisper transcript directly into `transcript` rather
  // than asking GPT-4o to echo it back, so this field always reflects
  // the verbatim Whisper output. We also mirror `transcript` onto
  // `eval_videos.transcript` for keyword scans.
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

  // Anti-fraud signals. The provider is given the expected product +
  // brand name and asked to confirm the product is actually visible in
  // the video. Both nullable — model returns null if it couldn't tell
  // (e.g. audio-only segments, glare, very dark frames). The admin UI
  // flags low/none confidence + product_visible=false with a coral
  // warning badge so a human can review before payout.
  product_visible_in_video: z.boolean().nullable(),
  product_match_confidence: z
    .enum(['high', 'medium', 'low', 'none'])
    .nullable(),
})

export type ExtractedEval = z.infer<typeof ExtractedEvalSchema>

export const EXTRACTION_PROMPT = `You are extracting structured evaluation data from a creator's video review of a product. You will receive TWO inputs:

  1. A transcript of the creator's spoken audio (already transcribed by Whisper, included verbatim below).
  2. A small number of time-ordered keyframes sampled from the video (first to last). Use these for visual signals — packaging, how they hold the product, facial reactions, gestures, room/setting context, demonstrated use cases.

Use BOTH signals when filling fields that have visual content.

Return a single JSON object matching the schema exactly. Only fill fields that are actually present in the inputs — use null (or empty array for list fields) for anything the creator did not address. Do not infer or guess.

## Expected product
The creator was sent: "{product_name}" by "{brand_name}".

When evaluating product_visible_in_video, mark TRUE only if you actually see
something matching the expected product (packaging, label, distinctive shape).
A product mentioned only in audio without visible confirmation = FALSE.
For product_match_confidence:
  - "high": clearly visible, label/branding readable, matches expected product
  - "medium": product visible but distant or partially obscured; can identify
    by shape/color but not branding
  - "low": something product-shaped is visible but unclear if it's the expected one
  - "none": no product visible, or visible product clearly mismatched (e.g.,
    expected: shampoo, visible: a cup of coffee)

Field semantics:
- transcript: leave this as null or omit it; the server overwrites it with the verbatim Whisper transcript before saving.
- visual_observations: things you see in the keyframes that aren't spoken — packaging shots, how they hold the product, facial expressions, gestures, room/setting context, what's on screen alongside the product. One short observation per array entry.
- demonstrated_use_cases: ways the creator actually USED the product on camera (visible in the keyframes), not just mentioned in audio. One use case per entry.
- would_keep_using / worth_the_price / sentiment: the creator's stance, drawn from spoken AND visual cues (e.g. visible enthusiasm, reluctance).
- best_for / not_for: audience or use-case fits the creator names.
- one_line_take: one sentence summarizing their overall verdict, in your words.
- raw_quotes: direct quotes from the spoken transcript that capture the creator's stance.
- product_visible_in_video / product_match_confidence: see the "Expected product" rules above. Use null for either if you genuinely cannot tell (e.g. only audio, no clear frames).

Schema:
{
  "transcript": null,
  "visual_observations": string[],
  "demonstrated_use_cases": string[],
  "would_keep_using": "yes" | "sometimes" | "no" | null,
  "worth_the_price": "yes" | "maybe_at_discount" | "no" | null,
  "best_for": string[],
  "not_for": string[],
  "one_line_take": string | null,
  "sentiment": "positive" | "mixed" | "negative" | null,
  "raw_quotes": string[],
  "product_visible_in_video": boolean | null,
  "product_match_confidence": "high" | "medium" | "low" | "none" | null
}
`
