import { describe, expect, it } from 'vitest'
import { spawn } from 'node:child_process'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'

import { extractAudio } from '@/lib/eval-extraction/audio'

/**
 * Build a tiny mp4 with a sine-wave audio track via ffmpeg's lavfi.
 * Two seconds of 440 Hz tone is enough to verify the extraction path
 * yields a non-empty mp3 blob.
 */
async function buildFixtureMp4WithAudio(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const args = [
      '-hide_banner', '-loglevel', 'error',
      '-y',
      '-f', 'lavfi', '-i', 'testsrc=duration=2:size=320x240:rate=10',
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-shortest',
      '-movflags', 'frag_keyframe+empty_moov+faststart',
      '-f', 'mp4',
      'pipe:1',
    ]
    const proc = spawn(ffmpegInstaller.path, args)
    const chunks: Buffer[] = []
    let stderr = ''
    proc.stdout.on('data', (c: Buffer) => chunks.push(c))
    proc.stderr.on('data', (c: Buffer) => {
      stderr += c.toString('utf8')
    })
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`fixture build failed (${code}): ${stderr}`))
        return
      }
      resolve(Buffer.concat(chunks))
    })
  })
}

describe('extractAudio (integration with real ffmpeg)', () => {
  it('extracts a non-empty mp3 audio blob from a tiny synthetic mp4', async () => {
    const mp4 = await buildFixtureMp4WithAudio()
    const blob = new Blob([mp4], { type: 'video/mp4' })
    const audio = await extractAudio(blob)

    // Whisper-compatible mime types: mp3 / mp4 / mpeg / mpga / m4a /
    // wav / webm. We emit `audio/mpeg` (mp3).
    expect(audio.type).toBe('audio/mpeg')
    expect(audio.size).toBeGreaterThan(0)

    // Sanity-check the leading bytes look like an MP3/ID3 stream.
    // libmp3lame writes an ID3v2 tag by default ("ID3") at the start,
    // and otherwise an MPEG audio frame begins with 0xFF Fx/Ex.
    const buf = Buffer.from(await audio.arrayBuffer())
    const header = buf.subarray(0, 3).toString('ascii')
    const isId3 = header === 'ID3'
    const isMpegFrame =
      buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0
    expect(isId3 || isMpegFrame).toBe(true)
  }, 30_000)
})
