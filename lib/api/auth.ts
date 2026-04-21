import 'server-only'

import { NextResponse, type NextRequest } from 'next/server'

import { hashToken } from '@/lib/api-tokens'
import { supabaseAdmin } from '@/lib/supabase/admin'

type AuthOk = {
  ok: true
  tokenId: string
  scopes: string[]
}

type AuthErr = {
  ok: false
  response: NextResponse
}

export type AuthResult = AuthOk | AuthErr

export function jsonError(
  status: number,
  code: string,
  message?: string
): NextResponse {
  return NextResponse.json(
    { error: { code, message: message ?? code } },
    { status }
  )
}

/**
 * Verify a bearer token and confirm the given scope is on the token.
 * Updates `last_used_at` fire-and-forget so a slow network doesn't block the
 * request. Returns either `{ok: true, ...}` with the token record, or
 * `{ok: false, response}` with a ready-to-return 401/403.
 */
export async function verifyBearerToken(
  request: NextRequest | Request,
  requiredScope: string
): Promise<AuthResult> {
  const header = request.headers.get('authorization') ?? ''
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  if (!match) {
    return {
      ok: false,
      response: jsonError(401, 'missing_bearer', 'Missing Authorization: Bearer <token>'),
    }
  }
  const token = match[1].trim()
  if (!token) {
    return {
      ok: false,
      response: jsonError(401, 'missing_bearer'),
    }
  }

  const hash = hashToken(token)
  const { data, error } = await supabaseAdmin
    .from('api_tokens')
    .select('id, scopes, revoked_at')
    .eq('token_hash', hash)
    .maybeSingle()

  if (error) {
    return { ok: false, response: jsonError(500, 'token_lookup_failed', error.message) }
  }
  if (!data) {
    return { ok: false, response: jsonError(401, 'invalid_token') }
  }
  if (data.revoked_at) {
    return { ok: false, response: jsonError(401, 'token_revoked') }
  }
  if (!data.scopes.includes(requiredScope)) {
    return {
      ok: false,
      response: jsonError(
        403,
        'missing_scope',
        `Token is missing required scope: ${requiredScope}`
      ),
    }
  }

  // Fire-and-forget. Awaiting this adds latency on every call for no user benefit.
  void supabaseAdmin
    .from('api_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)

  return { ok: true, tokenId: data.id, scopes: data.scopes }
}
