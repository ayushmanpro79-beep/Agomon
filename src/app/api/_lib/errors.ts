// agomon/src/app/api/_lib/errors.ts
export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'NO_RESULT'
  | 'RATE_LIMITED'
  | 'INTERNAL'

export function errorJson(code: ErrorCode, message: string, status: number) {
  return Response.json({ success: false, error: { code, message } }, { status, headers: corsHeadersForError() })
}

export function successJson(data: any, status = 200, extraHeaders: Record<string,string> = {}) {
  return Response.json({ success: true, data }, { status, headers: { ...corsHeaders(), ...extraHeaders } })
}

// minimal CORS helper for error path (no request available)
function corsHeadersForError(): Record<string,string> {
  const origin = process.env.BOTPRESS_ALLOWED_ORIGIN || '*'
  return {
    'Access-Control-Allow-Origin': origin.includes(',') ? origin.split(',')[0].trim() : origin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Vary': 'Origin',
  }
}

function corsHeaders(): Record<string,string> {
  const origin = process.env.BOTPRESS_ALLOWED_ORIGIN || '*'
  return {
    'Access-Control-Allow-Origin': origin.includes(',') ? origin.split(',')[0].trim() : origin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Vary': 'Origin',
  }
}
