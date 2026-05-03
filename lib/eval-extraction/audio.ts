import 'server-only'

import { spawn } from 'node:child_process'

import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'

const FFMPEG_BIN = ffmpegInstaller.path

/**
 * Run ffmpeg with the given args, piping `input` into stdin and
 * returning the raw stdout buffer once the process exits 0.
 *
 * Mirrors the `runFfmpeg` helper in `keyframes.ts`. Kept local instead
 * of factoring out so each extraction module owns its own ffmpeg
 * plumbing — they have slightly different stderr-handling preferences
 * and the duplication is minimal.
 */
async function runFfmpeg(args: string[], input: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG_BIN, args)
    const chunks: Buffer[] = []
    let stderr = ''

    proc.stdout.on('data', (chunk: Buffer) => chunks.push(chunk))
    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-500)}`))
        return
      }
      resolve(Buffer.concat(chunks))
    })

    // EPIPE protection: ffmpeg may close stdin early once it has read
    // enough header bytes. Swallow the resulting write error instead of
    // crashing the whole pipeline.
    proc.stdin.on('error', () => {})
    proc.stdin.write(input)
    proc.stdin.end()
  })
}

/**
 * Extracts the audio track from a video blob as compact mono MP3 via
 * ffmpeg. Output is sized for OpenAI Whisper's 25 MB input cap
 * regardless of source video size: mono, 16 kHz, 64 kbps gets us
 * ~30 KB/sec — a 10-minute eval audio ≈ 18 MB.
 *
 * Format choice: MP3 via libmp3lame. Verified bundled with
 * @ffmpeg-installer/ffmpeg on darwin-arm64 (and other platforms ship
 * libmp3lame as well — it's a standard part of the static build).
 * Whisper accepts mp3 natively, so no transcoding hop on their side.
 *
 * Returns a Blob ready to pass directly to
 * `whisper.audio.transcriptions.create` (wrap in a `File` first since
 * the OpenAI SDK requires File, not Blob).
 */
export async function extractAudio(videoBlob: Blob): Promise<Blob> {
  const input = Buffer.from(await videoBlob.arrayBuffer())

  // -vn drops the video stream; -ac 1 → mono; -ar 16000 → 16 kHz
  // (Whisper resamples to 16 kHz internally anyway, so we save bandwidth
  // by doing it locally); -b:a 64k → 64 kbps mp3.
  const args = [
    '-hide_banner',
    '-loglevel', 'error',
    '-i', 'pipe:0',
    '-vn',
    '-ac', '1',
    '-ar', '16000',
    '-b:a', '64k',
    '-f', 'mp3',
    'pipe:1',
  ]

  const out = await runFfmpeg(args, input)
  if (out.length === 0) {
    throw new Error('audio extraction produced an empty stream')
  }
  return new Blob([out], { type: 'audio/mpeg' })
}
