import { describe, it, expect, beforeEach, vi } from 'vitest'

// mock next/headers cookies not needed for health, but mock supabase server if imported
vi.mock('@/lib/supabase/server', () => ({
  createPlainServerClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null }) }) }) }) }),
}))

const KEY = 'test-health-key-123'

async function callHealth(auth?: string, method='GET') {
  const { GET, OPTIONS } = await import('../health/route')
  const req = new Request('http://localhost:3000/api/health', {
    method,
    headers: auth ? { Authorization: `Bearer ${auth}` } : {},
  })
  if (method==='OPTIONS') return OPTIONS(req)
  return GET(req)
}

describe('GET /api/health', () => {
  beforeEach(()=>{ process.env.BOTPRESS_API_KEY = KEY })

  it('401 when missing auth', async () => {
    const res = await callHealth(undefined)
    expect(res.status).toBe(401)
    const j = await res.json()
    expect(j.success).toBe(false)
    expect(j.error.code).toBe('UNAUTHORIZED')
  })

  it('401 when invalid key', async () => {
    const res = await callHealth('wrong')
    expect(res.status).toBe(401)
  })

  it('200 when valid', async () => {
    const res = await callHealth(KEY)
    expect(res.status).toBe(200)
    const j = await res.json()
    expect(j.success).toBe(true)
    expect(j.service).toBe('agomon-api')
  })

  it('OPTIONS returns 204 with CORS', async () => {
    const res = await callHealth(undefined, 'OPTIONS')
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeDefined()
  })
})
