import 'server-only'

import { randomBytes, createHash } from 'node:crypto'

const TOKEN_PREFIX = 'gf_'
const TOKEN_BYTES = 32

export function generateApiToken(): { token: string; hash: string } {
  const raw = randomBytes(TOKEN_BYTES).toString('base64url')
  const token = `${TOKEN_PREFIX}${raw}`
  return { token, hash: hashToken(token) }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function looksLikeApiToken(value: string): boolean {
  return value.startsWith(TOKEN_PREFIX) && value.length > TOKEN_PREFIX.length
}
