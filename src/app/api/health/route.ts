import { requireBotAuth } from '../_lib/botAuth'
import { getCorsHeaders, handleOptions } from '../_lib/cors'
import { checkRateLimit } from '../_lib/rateLimit'

export const dynamic = 'force-dynamic'

export async function OPTIONS(request: Request) {
  return handleOptions(request)
}

export async function GET(request: Request) {
  const rl = checkRateLimit(request)
  if (rl) return rl
  const authErr = requireBotAuth(request)
  if (authErr) return authErr

  try {
    return Response.json(
      { success: true, service: 'agomon-api' },
      { status: 200, headers: getCorsHeaders(request) }
    )
  } catch (e) {
    // never expose stack
    return Response.json(
      { success: false, error: { code: 'INTERNAL', message: 'Unexpected error' } },
      { status: 500, headers: getCorsHeaders(request) }
    )
  }
}
