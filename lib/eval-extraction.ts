import { createClient } from '@/lib/supabase/server'

import { ExtractedEvalSchema } from '@/lib/schemas/eval'

/**
 * Dependencies for `extractEval`. Real callers wire in
 * `transcribeWithWhisper` + `extractWithClaude` from
 * `lib/eval-extraction-providers.ts`. Tests pass mocks.
 */
export type ExtractEvalDeps = {
  transcribe: (blob: Blob) => Promise<string>
  extract: (transcript: string) => Promise<unknown>
}

/**
 * Run the eval extraction pipeline for a single match.
 *
 * Pipeline:
 *  1. Load latest `eval_videos` row for the match.
 *  2. Mark `transcript_status='running'`, download blob, transcribe.
 *  3. Save transcript or transcript_error.
 *  4. Mark `extraction_status='running'`, run extraction, validate.
 *  5. Save extracted JSON or extraction_error.
 *  6. On full success, flip `matches.stage='eval_complete'`.
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

  // ---- transcript step ----
  const { error: tRunErr } = await supabase
    .from('eval_videos')
    .update({ transcript_status: 'running', transcript_error: null })
    .eq('id', row.id)
  if (tRunErr) {
    return { ok: false, error: tRunErr.message }
  }

  let transcript: string
  try {
    const { data: blob, error: dlErr } = await supabase.storage
      .from('eval-videos')
      .download(row.blob_key)
    if (dlErr || !blob) {
      throw new Error(dlErr?.message ?? 'failed to download blob')
    }
    transcript = await deps.transcribe(blob)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await supabase
      .from('eval_videos')
      .update({ transcript_status: 'failed', transcript_error: msg })
      .eq('id', row.id)
    return { ok: false, error: msg }
  }

  const { error: tDoneErr } = await supabase
    .from('eval_videos')
    .update({
      transcript,
      transcript_status: 'complete',
      transcript_error: null,
    })
    .eq('id', row.id)
  if (tDoneErr) {
    return { ok: false, error: tDoneErr.message }
  }

  // ---- extraction step ----
  const { error: eRunErr } = await supabase
    .from('eval_videos')
    .update({ extraction_status: 'running', extraction_error: null })
    .eq('id', row.id)
  if (eRunErr) {
    return { ok: false, error: eRunErr.message }
  }

  let raw: unknown
  try {
    raw = await deps.extract(transcript)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await supabase
      .from('eval_videos')
      .update({ extraction_status: 'failed', extraction_error: msg })
      .eq('id', row.id)
    return { ok: false, error: msg }
  }

  const parsed = ExtractedEvalSchema.safeParse(raw)
  if (!parsed.success) {
    const msg = `extracted JSON did not match schema: ${parsed.error.message}`
    await supabase
      .from('eval_videos')
      .update({ extraction_status: 'failed', extraction_error: msg })
      .eq('id', row.id)
    return { ok: false, error: msg }
  }

  const now = new Date().toISOString()
  const { error: eDoneErr } = await supabase
    .from('eval_videos')
    .update({
      extracted: parsed.data,
      extraction_status: 'complete',
      extraction_error: null,
      extracted_at: now,
    })
    .eq('id', row.id)
  if (eDoneErr) {
    return { ok: false, error: eDoneErr.message }
  }

  // ---- match.stage flip ----
  const { error: stageErr } = await supabase
    .from('matches')
    .update({ stage: 'eval_complete', eval_complete_at: now })
    .eq('id', matchId)
  if (stageErr) {
    return { ok: false, error: stageErr.message }
  }

  return { ok: true }
}
