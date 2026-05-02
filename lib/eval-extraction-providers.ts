import 'server-only'

import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

import { EXTRACTION_PROMPT } from '@/lib/schemas/eval'

// Lazy singletons. The SDK constructors throw when the corresponding
// env var is missing, which would otherwise crash module-load — and
// that import chain runs from `_actions.ts` even on routes that don't
// call extraction. Defer until first use so missing keys only surface
// when an admin actually clicks "run extraction".
let _openai: OpenAI | null = null
function openaiClient(): OpenAI {
  if (!_openai) _openai = new OpenAI()
  return _openai
}

let _anthropic: Anthropic | null = null
function anthropicClient(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic()
  return _anthropic
}

/**
 * Real `transcribe` implementation backed by OpenAI Whisper. Wraps the
 * Supabase storage Blob into a File so the SDK accepts it.
 */
export async function transcribeWithWhisper(blob: Blob): Promise<string> {
  const file = new File([blob], 'eval.mp4', {
    type: blob.type || 'video/mp4',
  })
  const r = await openaiClient().audio.transcriptions.create({
    file,
    model: 'whisper-1',
  })
  return r.text
}

/**
 * Real `extract` implementation backed by Claude Haiku. Filters
 * text-typed content blocks, joins them, optionally strips a
 * ```json fence, then JSON.parse — caller validates the parsed
 * object against `ExtractedEvalSchema`.
 */
export async function extractWithClaude(transcript: string): Promise<unknown> {
  const r = await anthropicClient().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: EXTRACTION_PROMPT.replace('{transcript}', transcript),
      },
    ],
  })
  const text = r.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')
  const json = text.replace(/^```json\s*|\s*```$/g, '').trim()
  return JSON.parse(json)
}
