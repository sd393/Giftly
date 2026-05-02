import { describe, expect, it } from 'vitest'
import { spawn } from 'node:child_process'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'

import { extractKeyframes, splitJpegStream } from '@/lib/eval-extraction/keyframes'

/**
 * Generate a tiny mp4 fixture using ffmpeg's testsrc filter. We
 * stitch together two distinct testsrc segments concatenated to
 * trigger the scene-change detector at the seam:
 *   - Segment 1: smptebars 0-2s
 *   - Segment 2: testsrc   2-4s
 *
 * The seam at t=2s is a hard scene cut (entirely different palette
 * and pattern), so ffmpeg's `select='gt(scene,0.3)'` filter picks at
 * least one keyframe from each side. Both segments are individually
 * static, so a clip with N frames will yield ~1-2 scene changes.
 *
 * In practice this clip yields 1 frame from the scene filter, which
 * trips the fallback path in `extractKeyframes`. That's exactly what
 * we want to exercise — the fallback evenly-spaced sampler kicks in
 * and returns 3-12 frames.
 */
async function buildFixtureMp4(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const args = [
      '-hide_banner', '-loglevel', 'error',
      '-y',
      '-f', 'lavfi', '-i', 'smptebars=duration=2:size=320x240:rate=10',
      '-f', 'lavfi', '-i', 'testsrc=duration=2:size=320x240:rate=10',
      '-filter_complex', '[0:v][1:v]concat=n=2:v=1:a=0[outv]',
      '-map', '[outv]',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
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

describe('splitJpegStream', () => {
  it('splits a hand-crafted three-frame stream into three buffers', () => {
    // Three minimal "fake jpeg" frames: SOI ... EOI. Real JPEGs have
    // way more bytes between, but the splitter only cares about the
    // marker boundaries.
    const f1 = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x01, 0x02, 0xff, 0xd9])
    const f2 = Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0x03, 0x04, 0x05, 0xff, 0xd9])
    const f3 = Buffer.from([0xff, 0xd8, 0xff, 0xe2, 0xff, 0xd9])
    const stream = Buffer.concat([f1, f2, f3])
    const frames = splitJpegStream(stream)
    expect(frames).toHaveLength(3)
    expect(frames[0].equals(f1)).toBe(true)
    expect(frames[1].equals(f2)).toBe(true)
    expect(frames[2].equals(f3)).toBe(true)
  })

  it('drops a truncated trailing frame with no EOI marker', () => {
    const good = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0xff, 0xd9])
    const truncated = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0xde, 0xad])
    const stream = Buffer.concat([good, truncated])
    const frames = splitJpegStream(stream)
    expect(frames).toHaveLength(1)
    expect(frames[0].equals(good)).toBe(true)
  })

  it('returns empty when stream has no JPEG markers', () => {
    expect(splitJpegStream(Buffer.from([0x00, 0x01, 0x02]))).toEqual([])
  })
})

describe('extractKeyframes (integration with real ffmpeg)', () => {
  it('returns 3-12 keyframes from a tiny synthetic mp4', async () => {
    const mp4 = await buildFixtureMp4()
    const blob = new Blob([mp4], { type: 'video/mp4' })
    const frames = await extractKeyframes(blob)
    expect(frames.length).toBeGreaterThanOrEqual(3)
    expect(frames.length).toBeLessThanOrEqual(12)
    // Each frame must be a valid JPEG (SOI .. EOI).
    for (const f of frames) {
      expect(f[0]).toBe(0xff)
      expect(f[1]).toBe(0xd8)
      expect(f[f.length - 2]).toBe(0xff)
      expect(f[f.length - 1]).toBe(0xd9)
    }
  }, 30_000)
})
