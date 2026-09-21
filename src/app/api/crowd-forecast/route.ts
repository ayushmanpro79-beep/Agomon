import { z } from 'zod'
import { createPlainServerClient } from '@/lib/supabase/server'
import { predictCrowd, predict48Slots, clusterScore, landmarkScore, TIME_SLOTS } from '@/lib/crowd'
import { requireBotAuth } from '../_lib/botAuth'
import { getCorsHeaders, handleOptions } from '../_lib/cors'
import { checkRateLimit } from '../_lib/rateLimit'

export const dynamic = 'force-dynamic'

const Schema = z.object({
  pandalId: z.string().uuid().optional(),
  area: z.enum(['North Kolkata','Dumdum','South Kolkata','West Kolkata & Behala','Central Kolkata','Salt Lake & Rajarhat']).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  visitDate: z.string().optional(), // ISO date string
  visitTime: z.string().optional(), // HH:MM
  // alternative combined
  location: z.object({ latitude: z.number(), longitude: z.number() }).optional(),
}).refine(v=>!!(v.pandalId || v.area || (v.latitude!=null && v.longitude!=null) || v.location), { message: 'Provide at least pandalId or area or location (latitude+longitude)', path:['pandalId'] })

function levelFromScore(s:number){
  if (s>=82) return 'Peak'
  if (s>=68) return 'Very High'
  if (s>=48) return 'High'
  if (s>=28) return 'Moderate'
  return 'Low'
}

export async function OPTIONS(request: Request){ return handleOptions(request) }

export async function POST(request: Request){
  const rl = checkRateLimit(request)
  if (rl) return rl
  const authErr = requireBotAuth(request)
  if (authErr) return authErr

  let body:any
  try{ body=await request.json()}catch{
    return Response.json({ success:false, error:{code:'BAD_REQUEST', message:'Invalid JSON body'}}, { status:400, headers:getCorsHeaders(request)})
  }
  const parsed = Schema.safeParse(body)
  if(!parsed.success){
    const msg=parsed.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')
    return Response.json({ success:false, error:{code:'BAD_REQUEST', message:msg}}, { status:400, headers:getCorsHeaders(request)})
  }
  const { pandalId, area, latitude, longitude, visitDate, visitTime, location } = parsed.data

  // parse hour from visitDate/visitTime
  let hour = new Date().getHours() + new Date().getMinutes()/60
  let visitIso: string | null = null
  if (visitDate) {
    const d = new Date(visitDate)
    if (!isNaN(d.getTime())) {
      visitIso = d.toISOString()
      hour = d.getHours() + d.getMinutes()/60
      // if visitTime also provided, override time part
      if (visitTime && /^\d{1,2}:\d{2}$/.test(visitTime)) {
        const [hh,mm]=visitTime.split(':').map(Number)
        hour = hh + mm/60
        d.setHours(hh, mm, 0, 0)
        visitIso = d.toISOString()
      }
    }
  } else if (visitTime && /^\d{1,2}:\d{2}$/.test(visitTime)) {
    const [hh,mm]=visitTime.split(':').map(Number)
    if (hh>=0 && hh<24 && mm>=0 && mm<60) hour = hh + mm/60
    visitIso = visitTime
  }

  if (hour<0 || hour>=24) {
    return Response.json({ success:false, error:{code:'BAD_REQUEST', message:'visitTime must be HH:MM 00:00-23:59'}}, { status:400, headers:getCorsHeaders(request)})
  }

  try{
    const supabase = createPlainServerClient()
    let target: any = null
    let all: any[] = []

    const { data: allData } = await supabase.from('pandals').select('id,name,slug,area,latitude,longitude,avg_rating').limit(300)
    all = allData || []

    if (pandalId) {
      const { data, error } = await supabase.from('pandals').select('id,name,slug,area,latitude,longitude,avg_rating,address').eq('id', pandalId).single()
      if (error || !data) {
        return Response.json({ success:false, error:{code:'NOT_FOUND', message:'Pandal not found for pandalId'}}, { status:404, headers:getCorsHeaders(request)})
      }
      target = data
    } else if (latitude!=null && longitude!=null) {
      target = { id: `area-${area||'custom'}`, latitude, longitude, area: area || 'South Kolkata', avg_rating: 4.5 }
    } else if (location) {
      target = { id: `loc-${location.latitude}-${location.longitude}`, latitude: location.latitude, longitude: location.longitude, area: area || 'South Kolkata', avg_rating: 4.5 }
    } else if (area) {
      // pick centroid of area pandals
      const areaPandals = all.filter(p=>p.area===area && p.latitude && p.longitude)
      if (areaPandals.length===0) {
        return Response.json({ success:false, error:{code:'NO_RESULT', message:`No pandals with coordinates for area ${area}`}}, { status:200, headers:getCorsHeaders(request)})
      }
      const lat = areaPandals.reduce((s,p)=>s+p.latitude,0)/areaPandals.length
      const lon = areaPandals.reduce((s,p)=>s+p.longitude,0)/areaPandals.length
      target = { id: `area-${area}`, latitude: lat, longitude: lon, area, avg_rating: 4.2 }
    }

    if (!target || target.latitude==null || target.longitude==null) {
      return Response.json({ success:false, error:{code:'BAD_REQUEST', message:'Target has no coordinates'}}, { status:400, headers:getCorsHeaders(request)})
    }

    const crowdPercentage = predictCrowd(target as any, all as any, hour)
    const crowdLevel = levelFromScore(crowdPercentage)
    const slots48 = predict48Slots(target as any, all as any)
    const bestIdx = slots48.indexOf(Math.min(...slots48))
    const bestHour = bestIdx * 0.5
    const bestVisitingTime = `${String(Math.floor(bestHour)).padStart(2,'0')}:${bestHour%1===0?'00':'30'}`
    const timeSlot = TIME_SLOTS.find(s=>s.hours.includes(Math.floor(hour))) || TIME_SLOTS[3]
    const cs = clusterScore(target as any, all as any)
    const ls = landmarkScore(target as any, Math.floor(hour))

    const explanation = `${crowdLevel} crowd expected at ${Math.floor(hour)}:${String(Math.round((hour%1)*60)).padStart(2,'0')} (${timeSlot.desc}). ${cs.nearby} pandals within 1km, nearest ${ls.nearest} ${ls.nearest!=='—' ? `· cluster ${Math.round(cs.score*100)}% · poi ${Math.round(ls.score*100)}%` : ''}. Best window ${bestVisitingTime} (${Math.min(...slots48)}%).`

    return Response.json({
      success:true,
      data:{
        pandalId: pandalId || target.id,
        pandalName: (target as any).name || area || 'Area centroid',
        area: target.area,
        location: { latitude: target.latitude, longitude: target.longitude },
        requestedVisit: { visitDate: visitIso, visitTime: visitTime || null, hour },
        crowdPercentage,
        crowdLevel,
        bestVisitingTime,
        bestCrowdPercentage: Math.min(...slots48),
        timeSlot: { label: timeSlot.label, desc: timeSlot.desc, factor: timeSlot.factor },
        details: { clusterNearby: cs.nearby, clusterScore: Math.round(cs.score*100), landmark: ls.nearest, landmarkScore: Math.round(ls.score*100) },
        explanation,
        allSlots: slots48.map((score,i)=>({ time: `${String(Math.floor(i*0.5)).padStart(2,'0')}:${i%2===0?'00':'30'}`, score })),
      }
    }, { status:200, headers:getCorsHeaders(request)})

  }catch(e){
    return Response.json({ success:false, error:{code:'INTERNAL', message:'Unexpected error processing crowd forecast'}}, { status:500, headers:getCorsHeaders(request)})
  }
}
