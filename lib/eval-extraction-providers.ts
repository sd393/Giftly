import 'server-only'

import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

import { EXTRACTION_PROMPT } from '@/lib/schemas/eval'

// SDKs read OPENAI_API_KEY / ANTHROPIC_API_KEY from process.env.
const openai = new OpenAI()
const anthropic = new Anthropic()

/**
 * Real `transcribe` implementation backed by OpenAI Whisper. Wraps the
 * Supabase storage Blob into a File so the SDK accepts it.
 */
export async function transcribeWithWhisper(blob: Blob): Promise<string> {
  const file = new File([blob], 'eval.mp4', {
    type: blob.type || 'video/mp4',
  })
  const r = await openai.audio.transcriptions.create({
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
  const r = await anthropic.messages.create({
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
