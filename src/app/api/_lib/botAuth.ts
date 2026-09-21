// agomon/src/app/api/_lib/botAuth.ts
import { getCorsHeaders } from './cors'

export function requireBotAuth(request: Request): Response | null {
  const key = process.env.BOTPRESS_API_KEY
  if (!key) {
    return Response.json(
      { success: false, error: { code: 'INTERNAL', message: 'Server misconfigured: BOTPRESS_API_KEY not set' } },
      { status: 500, headers: getCorsHeaders(request) }
    )
  }
  const hdr = request.headers.get('authorization') || request.headers.get('Authorization') || ''
  const token = hdr.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return Response.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Missing Authorization: Bearer <token>' } },
      { status: 401, headers: getCorsHeaders(request) }
    )
  }
  // timing-safe compare not critical here, but use strict
  if (token !== key) {
    return Response.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid API key' } },
      { status: 401, headers: getCorsHeaders(request) }
    )
  }
  return null
}
