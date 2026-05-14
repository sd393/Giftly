import 'server-only'

import OpenAI from 'openai'

import { buildMessages } from '@/components/test/retailer_demo/lib/product'
import type { Variant } from '@/components/test/retailer_demo/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

let _openai: OpenAI | null = null
function openai(): OpenAI {
  if (!_openai) _openai = new OpenAI()
  return _openai
}

type Body = { variant?: Variant; query?: string }

export async function POST(req: Request) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return new Response('invalid json', { status: 400 })
  }

  const variant = body.variant === 'signal' ? 'signal' : 'baseline'
  const query = (body.query ?? '').trim()

  if (!query || query.length > 2000) {
    return new Response('invalid query', { status: 400 })
  }

  const encoder = new TextEncoder()
  const messages = buildMessages(variant, query)

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
      }

      try {
        const completion = await openai().chat.completions.create({
          model: 'gpt-5.2',
          stream: true,
          messages,
          temperature: 0.4,
        })

        for await (const chunk of completion) {
          const token = chunk.choices[0]?.delta?.content ?? ''
          if (token) send({ token })
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (err) {
        send({ error: 'stream_failed' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
