import { z } from 'zod'
import { findRoutes, rankPlans, allPlanList, availableStops } from '@/lib/travelRouter'
import busdata from '@/../data/busdata.json'
import { createPlainServerClient } from '@/lib/supabase/server'
import { haversineKm } from '@/lib/geo'
import { predictCrowd } from '@/lib/crowd'
import { requireBotAuth } from '../_lib/botAuth'
import { getCorsHeaders, handleOptions } from '../_lib/cors'
import { checkRateLimit } from '../_lib/rateLimit'

export const dynamic = 'force-dynamic'

const Schema = z.object({
  startPandal: z.string().trim().min(1).max(100),
  destinationPandal: z.string().trim().min(1).max(100),
  startPandalId: z.string().uuid().optional(),
  destinationPandalId: z.string().uuid().optional(),
  startCoordinates: z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).optional().nullable(),
  destinationCoordinates: z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).optional().nullable(),
  startAddress: z.string().max(300).optional().nullable(),
  destinationAddress: z.string().max(300).optional().nullable(),
  crowdForecast: z.any().optional(),
})

export async function OPTIONS(request: Request) { return handleOptions(request) }

// replicate TravelPlanClient resolveToStop server-side (haversine + areaHub)
async function resolveToStop(raw: string, pandals: any[]): Promise<string> {
  const stopsList = availableStops()
  const aliasMap = (busdata as any).aliases as Record<string,string>
  const key = raw.toLowerCase().trim().replace(/\s+/g,' ')
  if (aliasMap[key]) return aliasMap[key]
  const lowerRaw = raw.toLowerCase()
  for (const [k,v] of Object.entries(aliasMap)) if (key===k.toLowerCase()) return v
  // exact stop match (case-insensitive)
  const exact = stopsList.find(s=>s.toLowerCase()===lowerRaw)
  if (exact) return exact
  // pandal name → nearest geocoded stop <5km
  // try exact pandal name match
  const pandal = pandals.find(p=>p.name.toLowerCase()===lowerRaw || p.slug.toLowerCase()===lowerRaw || p.name.toLowerCase().includes(lowerRaw))
  if (pandal && pandal.latitude && pandal.longitude) {
    const geocodedStops = (busdata as any).stops.filter((s:any)=>s.lat && s.lng)
    let best: any=null, bestD=Infinity
    for (const s of geocodedStops) {
      const d=haversineKm({lat:pandal.latitude, lon:pandal.longitude},{lat:s.lat, lon:s.lng})
      if (d<bestD) {bestD=d; best=s}
    }
    if (best && bestD<5) return best.name
  }
  // areaHub fallback
  const areaHub: Record<string,string> = {
    'South Kolkata':'Tollygunge',
    'North Kolkata':'Shyambazar',
    'Central Kolkata':'Esplanade',
    'Dumdum':'Dum Dum',
    'West Kolkata & Behala':'Behala Chowrasta',
    'Salt Lake & Rajarhat':'Karunamoyee',
  }
  // if raw contains area name, map
  for (const [area,hub] of Object.entries(areaHub)) if (lowerRaw.includes(area.toLowerCase())) return hub
  // pandal area hub
  if (pandal?.area && areaHub[pandal.area]) return areaHub[pandal.area]
  // areaHints small map
  const hints: Record<string,string> = { 'chetla':'Chetla Park', 'howrah':'Howrah Station', 'park street':'Park Street', 'esplanade':'Esplanade', 'tollygunge':'Tollygunge' }
  for (const [k,v] of Object.entries(hints)) if (lowerRaw.includes(k)) return v
  // fallback to raw TitleCase canon will handle, return raw
  return raw.split(' ').map(w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join(' ').trim()
}

export async function POST(request: Request) {
  const rl = checkRateLimit(request)
  if (rl) return rl
  const authErr = requireBotAuth(request)
  if (authErr) return authErr

  let body: any
  try { body = await request.json() } catch {
    return Response.json({ success:false, error:{code:'BAD_REQUEST', message:'Invalid JSON body'}}, { status:400, headers:getCorsHeaders(request)})
  }
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')
    return Response.json({ success:false, error:{code:'BAD_REQUEST', message:msg}}, { status:400, headers:getCorsHeaders(request)})
  }
  const { startPandal, destinationPandal, startPandalId, destinationPandalId, startCoordinates, destinationCoordinates } = parsed.data

  try {
    const supabase = createPlainServerClient()
    // fetch pandals for resolve
    const { data: pandals } = await supabase.from('pandals').select('id,name,slug,area,latitude,longitude,address').limit(200)
    const pandalList = pandals || []

    // Resolve to bus stops
    let startStop = await resolveToStop(startPandal, pandalList)
    let destStop = await resolveToStop(destinationPandal, pandalList)

    // If IDs provided and coordinates provided, try to use nearest stop via coordinates directly
    if (startCoordinates) {
      const geocoded = (busdata as any).stops.filter((s:any)=>s.lat&&s.lng)
      let best=null, bd=Infinity
      for (const s of geocoded) {
        const d=haversineKm({lat:startCoordinates.latitude, lon:startCoordinates.longitude},{lat:s.lat, lon:s.lng})
        if (d<bd) {bd=d; best=s}
      }
      if (best && bd<5) startStop = best.name
    }
    if (destinationCoordinates) {
      const geocoded=(busdata as any).stops.filter((s:any)=>s.lat&&s.lng)
      let best=null,bd=Infinity
      for (const s of geocoded) {
        const d=haversineKm({lat:destinationCoordinates.latitude, lon:destinationCoordinates.longitude},{lat:s.lat, lon:s.lng})
        if(d<bd){bd=d; best=s}
      }
      if(best && bd<5) destStop=best.name
    }

    const result = findRoutes(startStop, destStop) as any
    if (result.error === 'unknown stop') {
      return Response.json({
        success: true,
        data: {
          startPandal, destinationPandal,
          startResolved: startStop, destResolved: destStop,
          crowdForecast: body.crowdForecast ?? null,
          plans: [],
          meta: { error: 'NO_RESULT', message: `Unknown stop: ${result.origin} or ${result.dest} not in bus network`, resolvedFrom: { start: startStop, dest: destStop } }
        }
      }, { status:200, headers:getCorsHeaders(request)})
    }

    // crowd boost if start is pandal
    let crowdBoost: number | undefined
    if (startPandalId || destinationPandalId) {
      const pid = startPandalId || destinationPandalId!
      const p = pandalList.find(x=>x.id===pid)
      if (p && p.latitude && p.longitude) {
        try { crowdBoost = predictCrowd(p as any, pandalList as any, new Date().getHours()) } catch {}
      }
    } else {
      const p = pandalList.find(x=>x.name.toLowerCase()===startPandal.toLowerCase())
      if (p && p.latitude) try { crowdBoost = predictCrowd(p as any, pandalList as any, new Date().getHours()) } catch {}
    }

    const all = allPlanList(result)
    const ranked = rankPlans(all, 'time', crowdBoost)
    const top = ranked.slice(0,3)

    // If no plans, return empty (never invent fake)
    if (top.length===0) {
      return Response.json({
        success:true,
        data:{
          startPandal, destinationPandal,
          startPandalId: startPandalId||null, destinationPandalId: destinationPandalId||null,
          startCoordinates: startCoordinates||null, destinationCoordinates: destinationCoordinates||null,
          startResolved: startStop, destResolved: destStop,
          crowdForecast: body.crowdForecast ?? crowdBoost ?? null,
          plans: [],
          meta: { totalFound: 0, message: 'No route found in bus/metro graph' }
        }
      }, { status:200, headers:getCorsHeaders(request)})
    }

    // Build verified plans with required fields, never invent missing
    const plans = top.map((plan:any, idx:number) => {
      const transfers = Math.max(0, plan.legs.length - 1)
      const metroDetails = plan.legs.filter((l:any)=>l.kind==='metro').map((l:any)=>({
        route: l.route, from: l.from, to: l.to, towards: l.towards || null, stops: l.stops || []
      }))
      // per leg details
      const legs = plan.legs.map((l:any)=>{
        // try to find lat/lon for boarding/dest stops if geocoded
        const fromStop = (busdata as any).stops.find((s:any)=>s.name===l.from)
        const toStop = (busdata as any).stops.find((s:any)=>s.name===l.to)
        return {
          route: l.route, // bus code or route number
          busCode: l.route,
          routeNumber: l.route,
          kind: l.kind,
          boardingStop: l.from,
          destinationStop: l.to,
          from: l.from, to: l.to,
          towards: l.towards || null,
          intermediateStops: l.stops ? l.stops.slice(1,-1) : [],
          stops: l.stops || [],
          boardingCoordinates: fromStop?.lat ? { latitude: fromStop.lat, longitude: fromStop.lng } : null,
          destinationCoordinates: toStop?.lat ? { latitude: toStop.lat, longitude: toStop.lng } : null,
          distanceKm: l.stops ? Math.round((l.stops.length-1)*0.85*10)/10 : null,
          link: fromStop?.lat && toStop?.lat ? `https://www.google.com/maps/dir/?api=1&origin=${fromStop.lat},${fromStop.lng}&destination=${toStop.lat},${toStop.lng}&travelmode=transit` : null,
        }
      })
      const firstLeg = legs[0], lastLeg = legs[legs.length-1]
      const overallLink = firstLeg.boardingCoordinates && lastLeg.destinationCoordinates
        ? `https://www.google.com/maps/dir/?api=1&origin=${firstLeg.boardingCoordinates.latitude},${firstLeg.boardingCoordinates.longitude}&destination=${lastLeg.destinationCoordinates.latitude},${lastLeg.destinationCoordinates.longitude}&travelmode=transit`
        : null
      return {
        rank: idx+1,
        travelMode: plan.kind, // bus | metro | mixed
        mode: plan.kind,
        route: plan.legs.map((l:any)=>l.route).join(' → '),
        transfers,
        metroDetails,
        legs,
        boardingStop: firstLeg.from,
        destinationStop: lastLeg.to,
        intermediateStops: legs.flatMap((l:any)=>l.intermediateStops),
        distanceKm: legs.reduce((s:number,l:any)=>s+(l.distanceKm||0),0) || null,
        durationMin: plan.timeMin ?? null,
        duration: plan.timeMin ?? null,
        fare: plan.fare ?? null,
        fareInr: plan.fare ?? null,
        cost: plan.cost ?? null,
        link: overallLink,
        googleMapsUrl: overallLink,
        links: overallLink ? [overallLink] : [],
      }
    })

    return Response.json({
      success:true,
      data:{
        startPandal, destinationPandal,
        startPandalId: startPandalId||null, destinationPandalId: destinationPandalId||null,
        startCoordinates: startCoordinates||null, destinationCoordinates: destinationCoordinates||null,
        startAddress: body.startAddress||null, destinationAddress: body.destinationAddress||null,
        startResolved: startStop, destResolved: destStop,
        crowdForecast: body.crowdForecast ?? crowdBoost ?? null,
        plans,
        meta: { totalFound: ranked.length, returned: plans.length, direct: result.direct.length, one: result.one.length, two: result.two.length }
      }
    }, { status:200, headers:getCorsHeaders(request)})

  } catch (e) {
    return Response.json({ success:false, error:{code:'INTERNAL', message:'Unexpected error processing travel plan'}}, { status:500, headers:getCorsHeaders(request)})
  }
}
