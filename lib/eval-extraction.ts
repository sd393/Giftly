import { createClient } from '@/lib/supabase/server'

import { ExtractedEvalSchema } from '@/lib/schemas/eval'

/**
 * Dependencies for `extractEval`. Real callers wire in
 * `extractFromVideoWithOpenAI` from `lib/eval-extraction-providers.ts`.
 * Tests pass mocks.
 */
export type ExtractEvalDeps = {
  extract: (videoBlob: Blob) => Promise<unknown>
}

/**
 * Run the eval extraction pipeline for a single match.
 *
 * Pipeline:
 *  1. Load latest `eval_videos` row for the match.
 *  2. Guard: skip if `extraction_status='running'`.
 *  3. Mark `extraction_status='running'`, download blob, hand it to
 *     the multimodal extractor.
 *  4. Validate the returned JSON. On parse failure, mark both
 *     `extraction_status='failed'` and `transcript_status='failed'`
 *     (the single OpenAI provider call produces both — they succeed
 *     or fail together, since Whisper and GPT-4o vision both run
 *     inside the same provider).
 *  5. Save extracted JSON, copy the `transcript` field from it onto
 *     the legacy `transcript` column (downstream agents may scan it
 *     independently of the structured fields), and mark both
 *     statuses 'complete'.
 *  6. Flip `matches.stage='eval_complete'` and stamp
 *     `eval_complete_at`.
 *
 * Idempotent: re-running on a `complete` eval cleanly overwrites the
 * previous extraction (admin can re-tune the prompt and re-run). The
 * only state we refuse to clobber is one already in flight
 * (`extraction_status='running'`).
 */
export async function extractEval(
  matchId: string,
  deps: ExtractEvalDeps,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: row, error: loadErr } = await supabase
    .from('eval_videos')
    .select('id, match_id, blob_key, transcript, extraction_status')
    .eq('match_id', matchId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  if (loadErr || !row) {
    return { ok: false, error: 'eval row not found' }
  }
  if (row.extraction_status === 'running') {
    return { ok: false, error: 'already running' }
  }

  const { error: runErr } = await supabase
    .from('eval_videos')
    .update({
      extraction_status: 'running',
      extraction_error: null,
      transcript_status: 'running',
      transcript_error: null,
    })
    .eq('id', row.id)
  if (runErr) {
    return { ok: false, error: runErr.message }
  }

  let raw: unknown
  try {
    const { data: blob, error: dlErr } = await supabase.storage
      .from('eval-videos')
      .download(row.blob_key)
    if (dlErr || !blob) {
      throw new Error(dlErr?.message ?? 'failed to download blob')
    }
    raw = await deps.extract(blob)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await supabase
      .from('eval_videos')
      .update({
        extraction_status: 'failed',
        extraction_error: msg,
        transcript_status: 'failed',
        transcript_error: msg,
      })
      .eq('id', row.id)
    return { ok: false, error: msg }
  }

  const parsed = ExtractedEvalSchema.safeParse(raw)
  if (!parsed.success) {
    const msg = `extracted JSON did not match schema: ${parsed.error.message}`
    await supabase
      .from('eval_videos')
      .update({
        extraction_status: 'failed',
        extraction_error: msg,
        transcript_status: 'failed',
        transcript_error: msg,
      })
      .eq('id', row.id)
    return { ok: false, error: msg }
  }

  const now = new Date().toISOString()
  const { error: doneErr } = await supabase
    .from('eval_videos')
    .update({
      extracted: parsed.data,
      extraction_status: 'complete',
      extraction_error: null,
      extracted_at: now,
      // Mirror the model-produced transcript onto the legacy column so
      // admin keyword scans / downstream agents can query it without
      // touching the structured `extracted` jsonb.
      transcript: parsed.data.transcript,
      transcript_status: 'complete',
      transcript_error: null,
    })
    .eq('id', row.id)
  if (doneErr) {
    return { ok: false, error: doneErr.message }
  }

  const { error: stageErr } = await supabase
    .from('matches')
    .update({ stage: 'eval_complete', eval_complete_at: now })
    .eq('id', matchId)
  if (stageErr) {
    return { ok: false, error: stageErr.message }
  }

  return { ok: true }
}
