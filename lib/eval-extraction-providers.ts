import 'server-only'

import OpenAI from 'openai'

import { extractKeyframes } from '@/lib/eval-extraction/keyframes'
import { EXTRACTION_PROMPT } from '@/lib/schemas/eval'

// Lazy singleton. The OpenAI SDK constructor reads `OPENAI_API_KEY`
// from env at construction; deferring keeps a missing key from
// crashing module-load (this file is imported via _actions.ts even on
// routes that never trigger extraction).
let _openai: OpenAI | null = null
function openai(): OpenAI {
  if (!_openai) _openai = new OpenAI()
  return _openai
}

/**
 * Real `extract` implementation backed by OpenAI Whisper +
 * GPT-4o vision.
 *
 * Pipeline (transcript and frames run in parallel on the same blob):
 *  1. ffmpeg scene-detect → ~3-12 JPEG keyframes (512px wide).
 *  2. Whisper transcribes the audio track.
 *  3. GPT-4o vision gets the transcript inlined into the extraction
 *     prompt + every keyframe in chronological order, returns a
 *     single JSON object matching `ExtractedEvalSchema`.
 *
 * Why GPT-4o + keyframes instead of Gemini multimodal video: user
 * prefers OpenAI credits, and the keyframe step keeps token cost
 * bounded (8 frames at detail:'low' ≈ 680 tokens vs ~6000 for the
 * same video at full res).
 *
 * The transcript is injected into the parsed JSON server-side rather
 * than asking GPT-4o to echo it back — saves output tokens and avoids
 * the model paraphrasing it.
 */
export async function extractFromVideoWithOpenAI(
  videoBlob: Blob,
): Promise<unknown> {
  const [keyframes, transcript] = await Promise.all([
    extractKeyframes(videoBlob),
    transcribeWithWhisper(videoBlob),
  ])

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `${EXTRACTION_PROMPT}\n\n--- TRANSCRIPT ---\n${transcript}\n--- END TRANSCRIPT ---\n\nThe ${keyframes.length} images that follow are time-ordered keyframes from the video (first to last).`,
        },
        ...keyframes.map((buf) => ({
          type: 'image_url' as const,
          image_url: {
            url: `data:image/jpeg;base64,${buf.toString('base64')}`,
            // 512px frames, low detail is sufficient and ~6x cheaper.
            detail: 'low' as const,
          },
        })),
      ],
    },
  ]

  const r = await openai().chat.completions.create({
    model: 'gpt-4o',
    messages,
    response_format: { type: 'json_object' },
    max_tokens: 1024,
  })

  const text = r.choices[0]?.message?.content ?? ''
  const parsed = JSON.parse(text) as Record<string, unknown>

  // Inject the Whisper transcript directly — saves output tokens and
  // avoids GPT silently paraphrasing it. The schema still requires
  // `transcript`, so this also guarantees the field is present.
  parsed.transcript = transcript || null
  return parsed
}

async function transcribeWithWhisper(videoBlob: Blob): Promise<string> {
  // OpenAI's File API expects a Web `File`, not a Blob. The mime type
  // matters for codec detection on the Whisper side.
  const file = new File([videoBlob], 'eval.mp4', {
    type: videoBlob.type || 'video/mp4',
  })
  const r = await openai().audio.transcriptions.create({
    file,
    model: 'whisper-1',
  })
  return r.text
}
