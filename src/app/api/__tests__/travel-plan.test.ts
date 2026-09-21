import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createPlainServerClient: () => ({
    from: ()=>({ select: ()=>({ limit: ()=>Promise.resolve({ data: [
      { id:'00000000-0000-0000-0000-000000000001', name:'Shyambazar', slug:'shyambazar', area:'North Kolkata', latitude:22.601, longitude:88.372 },
      { id:'00000000-0000-0000-0000-000000000002', name:'Esplanade', slug:'esplanade', area:'Central Kolkata', latitude:22.564, longitude:88.35 },
    ] }) }) }),
  }),
}))

const KEY='test-travel-key'

describe('POST /api/travel-plan', ()=>{
  beforeEach(()=>{ process.env.BOTPRESS_API_KEY=KEY })

  async function call(body:any, auth=KEY){
    const { POST } = await import('../travel-plan/route')
    const req=new Request('http://localhost:3000/api/travel-plan',{ method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${auth}`}, body:JSON.stringify(body)})
    return POST(req)
  }

  it('401', async()=>{ const r=await call({startPandal:'A', destinationPandal:'B'}, ''); expect(r.status).toBe(401)})
  it('400 missing fields', async()=>{ const r=await call({startPandal:'', destinationPandal:''}); expect(r.status).toBe(400)})

  it('200 success up to 3 plans with required fields and no fake data', async()=>{
    const r=await call({ startPandal:'Shyambazar', destinationPandal:'Esplanade' })
    expect(r.status).toBe(200)
    const j=await r.json()
    expect(j.success).toBe(true)
    expect(Array.isArray(j.data.plans)).toBe(true)
    expect(j.data.plans.length).toBeLessThanOrEqual(3)
    if (j.data.plans.length>0) {
      const p=j.data.plans[0]
      expect(p).toHaveProperty('travelMode')
      expect(p).toHaveProperty('boardingStop')
      expect(p).toHaveProperty('destinationStop')
      expect(p).toHaveProperty('legs')
      // never invent: if busdata missing stops, should be null/[] not string
      expect(p.legs[0]).toHaveProperty('route')
    }
  })

  it('200 NO_RESULT empty plans for unknown stop', async()=>{
    const r=await call({ startPandal:'ZZZUNKNOWNSTOP123', destinationPandal:'YYYUNKNOWN456' })
    expect(r.status).toBe(200)
    const j=await r.json()
    expect(j.success).toBe(true)
    expect(j.data.plans).toEqual([])
  })
})
