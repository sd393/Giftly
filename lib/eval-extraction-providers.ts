import 'server-only'

import { GoogleGenerativeAI } from '@google/generative-ai'

import { EXTRACTION_PROMPT } from '@/lib/schemas/eval'

// Lazy singleton. The SDK constructor throws if `GEMINI_API_KEY` is
// missing, which would otherwise crash module-load — and that import
// chain runs from `_actions.ts` even on routes that don't trigger
// extraction. Defer until first use so a missing key only surfaces
// when an admin actually clicks "run extraction".
let _gemini: GoogleGenerativeAI | null = null
function gemini(): GoogleGenerativeAI {
  if (!_gemini) _gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  return _gemini
}

/**
 * Real `extract` implementation backed by Gemini 2.5 Pro multimodal.
 * Sends the raw video blob (audio + frames) to Gemini, asks for the
 * full structured eval as JSON in one shot. Caller validates the
 * parsed object against `ExtractedEvalSchema`.
 *
 * NOTE: Gemini's inline-data input format technically tops out around
 * 20MB; videos beyond that need the File API (upload, then reference
 * the file URI). Our submit cap is 100MB but real eval clips usually
 * land in the 5-30MB range, so inline is fine for v1. If we start
 * seeing failures on larger uploads, swap to:
 *   const upload = await gemini().files.upload(...)
 *   model.generateContent([{ fileData: { fileUri: upload.uri, mimeType } }, ...])
 * Tracked as a follow-up.
 */
export async function extractFromVideoWithGemini(
  videoBlob: Blob,
): Promise<unknown> {
  const arrayBuf = await videoBlob.arrayBuffer()
  const base64 = Buffer.from(arrayBuf).toString('base64')

  const model = gemini().getGenerativeModel({
    model: 'gemini-2.5-pro',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  })

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: videoBlob.type || 'video/mp4',
        data: base64,
      },
    },
    { text: EXTRACTION_PROMPT },
  ])

  const text = result.response.text()
  return JSON.parse(text)
}
