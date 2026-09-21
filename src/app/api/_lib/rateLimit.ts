// agomon/src/app/api/_lib/rateLimit.ts
import { getCorsHeaders } from './cors'

type Entry = { count: number; reset: number }
const store = new Map<string, Entry>()

// 60 req/min per IP + 200/min per key window
const WINDOW_MS = 60 * 1000
const LIMIT_IP = 60
const LIMIT_KEY = 200

export function checkRateLimit(request: Request): Response | null {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
  const auth = request.headers.get('authorization') || 'anon'
  const now = Date.now()

  // per-IP
  const keyIp = `ip:${ip}`
  let e = store.get(keyIp)
  if (!e || now > e.reset) e = { count: 0, reset: now + WINDOW_MS }
  e.count++
  store.set(keyIp, e)
  if (e.count > LIMIT_IP) {
    const retry = Math.ceil((e.reset - now) / 1000)
    return Response.json(
      { success: false, error: { code: 'RATE_LIMITED', message: `Rate limit exceeded (${LIMIT_IP}/min per IP). Retry in ${retry}s` } },
      { status: 429, headers: { ...getCorsHeaders(request), 'Retry-After': String(retry) } }
    )
  }

  // per-key
  const keyAuth = `key:${auth.slice(0,32)}`
  let ek = store.get(keyAuth)
  if (!ek || now > ek.reset) ek = { count: 0, reset: now + WINDOW_MS }
  ek.count++
  store.set(keyAuth, ek)
  if (ek.count > LIMIT_KEY) {
    const retry = Math.ceil((ek.reset - now) / 1000)
    return Response.json(
      { success: false, error: { code: 'RATE_LIMITED', message: `Rate limit exceeded (${LIMIT_KEY}/min per key). Retry in ${retry}s` } },
      { status: 429, headers: { ...getCorsHeaders(request), 'Retry-After': String(retry) } }
    )
  }

  // periodic cleanup to avoid memory leak
  if (store.size > 5000) {
    for (const [k, v] of store.entries()) if (now > v.reset) store.delete(k)
  }
  return null
}
