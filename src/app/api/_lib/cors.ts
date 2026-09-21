// agomon/src/app/api/_lib/cors.ts
export function getCorsHeaders(request?: Request): Record<string,string> {
  const allowed = (process.env.BOTPRESS_ALLOWED_ORIGIN || 'https://cdn.botpress.cloud,https://files.bpcontent.cloud,https://studio.botpress.cloud,https://agomon.vercel.app').split(',').map(s=>s.trim())
  const origin = request?.headers.get('origin') || ''
  // If wildcard allowed, echo wildcard
  if (allowed.includes('*')) {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    }
  }
  // Echo exact origin if in allowlist, else first allowlisted
  const allowOrigin = origin && allowed.includes(origin) ? origin : allowed[0]
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
}

export function handleOptions(request: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(request) })
}
