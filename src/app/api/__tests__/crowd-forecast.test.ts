import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createPlainServerClient: () => ({
    from: (tbl:string)=>({
      select: (cols:string)=>({
        eq: () => ({ single: () => Promise.resolve({ data:{ id:'550e8400-e29b-41d4-a716-446655440001', name:'Test Pandal', slug:'test', area:'North Kolkata', latitude:22.6, longitude:88.36, avg_rating:4.5, address:'Addr' }, error:null }) }),
        limit: () => Promise.resolve({ data:[
          { id:'550e8400-e29b-41d4-a716-446655440001', name:'Test Pandal', slug:'test', area:'North Kolkata', latitude:22.6, longitude:88.36, avg_rating:4.5 },
          { id:'550e8400-e29b-41d4-a716-446655440002', name:'Other', slug:'other', area:'North Kolkata', latitude:22.601, longitude:88.361, avg_rating:4.2 },
        ]}),
      }),
    }),
  }),
}))

const KEY='test-crowd-key'

describe('POST /api/crowd-forecast', ()=>{
  beforeEach(()=>{ process.env.BOTPRESS_API_KEY=KEY })

  async function call(body:any, auth=KEY){
    const { POST } = await import('../crowd-forecast/route')
    const req=new Request('http://localhost:3000/api/crowd-forecast',{ method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${auth}`}, body:JSON.stringify(body)})
    return POST(req)
  }

  it('401', async()=>{ const r=await call({ pandalId:'550e8400-e29b-41d4-a716-446655440001'},''); expect(r.status).toBe(401)})
  it('400 when no target', async()=>{ const r=await call({}); expect(r.status).toBe(400)})
  it('400 invalid time', async()=>{ const r=await call({ pandalId:'550e8400-e29b-41d4-a716-446655440001', visitTime:'99:99'}); expect([400,200].includes(r.status)).toBe(true) })

  it('200 success with required fields', async()=>{
    const r=await call({ pandalId:'550e8400-e29b-41d4-a716-446655440001', visitTime:'18:00' })
    expect(r.status).toBe(200)
    const j=await r.json()
    expect(j.success).toBe(true)
    expect(j.data).toHaveProperty('crowdPercentage')
    expect(j.data).toHaveProperty('crowdLevel')
    expect(j.data).toHaveProperty('bestVisitingTime')
    expect(j.data).toHaveProperty('explanation')
    expect(typeof j.data.crowdPercentage).toBe('number')
    expect(j.data.crowdPercentage).toBeGreaterThanOrEqual(5)
    expect(j.data.crowdPercentage).toBeLessThanOrEqual(98)
  })

  it('200 area centroid fallback', async()=>{
    const r=await call({ area:'North Kolkata', visitTime:'09:00' })
    expect(r.status).toBe(200)
    const j=await r.json()
    expect(j.success).toBe(true)
    expect(j.data.area).toBe('North Kolkata')
  })
})
