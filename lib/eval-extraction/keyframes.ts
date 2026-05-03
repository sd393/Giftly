import 'server-only'

import { spawn } from 'node:child_process'

import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'

const FFMPEG_BIN = ffmpegInstaller.path

const MIN_FRAMES = 3
const MAX_FRAMES = 12

/**
 * Run ffmpeg with the given args, piping `input` into stdin and
 * returning the raw stdout buffer once the process exits 0.
 *
 * Stays a thin helper so both the scene-detection pass and the
 * evenly-spaced fallback pass can share spawn/buffer plumbing.
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
 * Split a concatenated MJPEG stream into individual frame buffers by
 * scanning for SOI (`FF D8 FF`) start markers and EOI (`FF D9`) end
 * markers. Each SOI..EOI pair is one JPEG frame.
 *
 * Exported so the test can exercise the splitter on a hand-crafted
 * byte stream without spawning ffmpeg.
 */
export function splitJpegStream(buf: Buffer): Buffer[] {
  const frames: Buffer[] = []
  let i = 0
  while (i < buf.length - 1) {
    // SOI: FF D8 FF
    if (
      buf[i] === 0xff &&
      buf[i + 1] === 0xd8 &&
      i + 2 < buf.length &&
      buf[i + 2] === 0xff
    ) {
      const start = i
      // Walk forward looking for EOI: FF D9
      let j = i + 2
      while (j < buf.length - 1) {
        if (buf[j] === 0xff && buf[j + 1] === 0xd9) {
          frames.push(buf.subarray(start, j + 2))
          i = j + 2
          break
        }
        j++
      }
      if (j >= buf.length - 1) {
        // Truncated last frame — bail.
        break
      }
    } else {
      i++
    }
  }
  return frames
}

/**
 * Down-sample a frame list to exactly `target` frames, preserving the
 * first and last and picking the rest at evenly-spaced indices in
 * between. Lossless if `frames.length <= target`.
 */
function downsample(frames: Buffer[], target: number): Buffer[] {
  if (frames.length <= target) return frames
  if (target <= 2) return [frames[0], frames[frames.length - 1]]
  const out: Buffer[] = [frames[0]]
  const interior = target - 2
  // Pick interior frames at evenly-spaced indices in (0, len-1).
  for (let k = 1; k <= interior; k++) {
    const idx = Math.round((k * (frames.length - 1)) / (interior + 1))
    out.push(frames[idx])
  }
  out.push(frames[frames.length - 1])
  return out
}

/**
 * Extract ~8 representative keyframes from `videoBlob` using ffmpeg
 * scene-change detection (threshold 0.3) scaled to 512px wide JPEG.
 *
 * Strategy:
 *  1. Run scene-detect pass via stdin pipe. If it yields >= 3 frames,
 *     down-sample to <= 12 and return.
 *  2. Otherwise fall back to evenly-spaced sampling (10/30/50/70/90%
 *     of the frame count) to guarantee at least 3 frames.
 *
 * Returns 3-12 JPEG buffers. Throws if even the fallback can't yield
 * 3 frames (e.g. unreadable video).
 */
export async function extractKeyframes(videoBlob: Blob): Promise<Buffer[]> {
  const input = Buffer.from(await videoBlob.arrayBuffer())

  // Pass 1: scene-change detection.
  const sceneArgs = [
    '-hide_banner',
    '-loglevel', 'error',
    '-i', 'pipe:0',
    '-vf', "select='gt(scene,0.3)',scale=512:-1",
    '-vsync', 'vfr',
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    'pipe:1',
  ]
  const sceneOut = await runFfmpeg(sceneArgs, input)
  const sceneFrames = splitJpegStream(sceneOut)

  if (sceneFrames.length >= MIN_FRAMES) {
    return downsample(sceneFrames, MAX_FRAMES)
  }

  // Pass 2: fixed-rate fallback. Sample at 1 fps (clamped to 60 frames
  // to avoid blowing up on long clips), then evenly down-sample to
  // <= 12. Cheap, deterministic, and doesn't depend on ffmpeg knowing
  // the total frame count up front (the `N` const in the select filter
  // is only well-defined after probing, which streaming via pipe:0
  // doesn't always do).
  const fallbackArgs = [
    '-hide_banner',
    '-loglevel', 'error',
    '-i', 'pipe:0',
    '-vf', 'fps=1,scale=512:-1',
    '-frames:v', '60',
    '-vsync', 'vfr',
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    'pipe:1',
  ]
  const fallbackOut = await runFfmpeg(fallbackArgs, input)
  const fallbackFrames = splitJpegStream(fallbackOut)

  if (fallbackFrames.length < MIN_FRAMES) {
    // Last-ditch: if even 1fps yielded < 3 (e.g. a < 3-second clip),
    // ask ffmpeg for every frame, scale down, then downsample.
    const everyFrameArgs = [
      '-hide_banner',
      '-loglevel', 'error',
      '-i', 'pipe:0',
      '-vf', 'scale=512:-1',
      '-vsync', 'vfr',
      '-f', 'image2pipe',
      '-vcodec', 'mjpeg',
      'pipe:1',
    ]
    const everyFrameOut = await runFfmpeg(everyFrameArgs, input)
    const everyFrame = splitJpegStream(everyFrameOut)
    if (everyFrame.length < MIN_FRAMES) {
      throw new Error(
        `keyframe extraction yielded ${everyFrame.length} frames (need >= ${MIN_FRAMES})`,
      )
    }
    return downsample(everyFrame, MAX_FRAMES)
  }
  return downsample(fallbackFrames, MAX_FRAMES)
}
