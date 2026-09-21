import { z } from 'zod'
import { createPlainServerClient } from '@/lib/supabase/server'
import { getOptimizedRoute, fallbackNearestOrder, type RoutablePandal } from '@/lib/pujoRouting'
import { haversineKm } from '@/lib/geo'
import { requireBotAuth } from '../_lib/botAuth'
import { getCorsHeaders, handleOptions } from '../_lib/cors'
import { checkRateLimit } from '../_lib/rateLimit'

export const dynamic = 'force-dynamic'

const Schema = z.object({
  metroStation: z.string().trim().min(1).max(100),
  metroLatitude: z.number().min(-90).max(90),
  metroLongitude: z.number().min(-180).max(180),
  stopCount: z.coerce.number().int().min(2).max(10),
  selectedPandalIds: z.array(z.string().uuid()).min(1).max(20),
  crowdInformation: z.any().optional(),
})

export async function OPTIONS(request: Request) {
  return handleOptions(request)
}

export async function POST(request: Request) {
  const rl = checkRateLimit(request)
  if (rl) return rl
  const authErr = requireBotAuth(request)
  if (authErr) return authErr

  let body: any
  try {
    body = await request.json()
  } catch {
    return Response.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid JSON body' } }, { status: 400, headers: getCorsHeaders(request) })
  }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
    return Response.json({ success: false, error: { code: 'BAD_REQUEST', message: msg } }, { status: 400, headers: getCorsHeaders(request) })
  }

  const { metroStation, metroLatitude, metroLongitude, stopCount, selectedPandalIds } = parsed.data

  try {
    const supabase = createPlainServerClient()
    // Fetch selected pandals
    const { data: fetched, error } = await supabase
      .from('pandals')
      .select('id,name,slug,area,address,latitude,longitude')
      .in('id', selectedPandalIds)

    if (error) {
      return Response.json({ success: false, error: { code: 'INTERNAL', message: 'Failed to fetch pandals' } }, { status: 500, headers: getCorsHeaders(request) })
    }

    const verified = (fetched || []).filter(p => p.latitude != null && p.longitude != null) as any[]
    if (verified.length === 0) {
      return Response.json({ success: false, error: { code: 'NO_RESULT', message: 'No verified pandals found for provided IDs (missing coordinates)' } }, { status: 200, headers: getCorsHeaders(request) })
    }

    // If verified < stopCount, try to fill with nearby pandals around metro (up to stopCount)
    let pool: RoutablePandal[] = verified.map(p => ({ id: p.id, name: p.name, slug: p.slug, area: p.area, latitude: p.latitude!, longitude: p.longitude! }))
    if (pool.length < stopCount) {
      const { data: nearby } = await supabase
        .from('pandals')
        .select('id,name,slug,area,latitude,longitude,address')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(50)
      const extra = (nearby || [])
        .filter(p => !pool.some(q => q.id === p.id))
        .map(p => ({ ...p, dist: haversineKm({ lat: metroLatitude, lon: metroLongitude }, { lat: p.latitude!, lon: p.longitude! }) }))
        .sort((a,b)=>a.dist-b.dist)
        .slice(0, stopCount - pool.length)
        .map(p=>({ id:p.id, name:p.name, slug:p.slug, area:p.area, latitude:p.latitude!, longitude:p.longitude! }))
      pool = [...pool, ...extra]
    }

    // If still > stopCount, shuffle and slice to stopCount (random selection as per spec)
    if (pool.length > stopCount) {
      // Fisher-Yates shuffle
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[pool[i], pool[j]] = [pool[j], pool[i]]
      }
      pool = pool.slice(0, stopCount)
    }

    // Prepare routable list: metro as fixed start (source=first)
    const start: RoutablePandal = { id: 'metro-start', name: metroStation, slug: 'metro-start', area: 'Metro', latitude: metroLatitude, longitude: metroLongitude }
    const list: RoutablePandal[] = [start, ...pool]

    let optimized = await getOptimizedRoute(list)
    let fallback = false
    let roadCoordinates: { latitude:number, longitude:number }[] | null = null
    let distance = 0
    let duration = 0
    let geojson: any = null
    let optimizedWithoutStart: RoutablePandal[] = pool

    if (optimized) {
      // optimized includes start as first due to source=first
      optimizedWithoutStart = optimized.optimizedPandals.filter(p => p.id !== 'metro-start')
      roadCoordinates = optimized.roadCoordinates
      distance = optimized.distance
      duration = optimized.duration
      geojson = optimized.geojson
    } else {
      fallback = true
      const fb = fallbackNearestOrder(list)
      optimizedWithoutStart = fb.filter(p => p.id !== 'metro-start')
      // haversine sum for fallback
      let totalM = 0
      for (let i = 1; i < fb.length; i++) {
        totalM += haversineKm({ lat: fb[i-1].latitude, lon: fb[i-1].longitude }, { lat: fb[i].latitude, lon: fb[i].longitude }) * 1000
      }
      distance = Math.round(totalM)
      duration = Math.round((totalM / 1000) * 8 * 60 + optimizedWithoutStart.length * 60) // approx 8 min/km + 1min per stop
      // build LineString geojson for fallback
      geojson = {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: fb.map(p=>[p.longitude,p.latitude]) }, properties: { fallback:true } }]
      }
      roadCoordinates = fb.slice(1).map(p=>({ latitude:p.latitude, longitude:p.longitude }))
    }

    // Build ordered details with addresses
    const byId = new Map(pool.map(p=>[p.id,p]))
    // Need address map from fetched
    const addrMap = new Map((fetched||[]).map((p:any)=>[p.id, p.address]))
    // For extra pool items, fetch address if missing? already has
    const ordered = optimizedWithoutStart.map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      area: p.area,
      latitude: p.latitude,
      longitude: p.longitude,
      address: addrMap.get(p.id) || null,
    }))

    // Coordinates/addresses in order
    const coordinates = ordered.map(p=>({ latitude:p.latitude, longitude:p.longitude }))
    const addresses = ordered.map(p=>p.address)

    // Distances/durations per segment (haversine + OSRM proportional if available)
    const segmentDetails: any[] = []
    for (let i = 0; i < ordered.length - 1; i++) {
      const a = ordered[i], b = ordered[i+1]
      const dKm = haversineKm({lat:a.latitude,lon:a.longitude},{lat:b.latitude,lon:b.longitude})
      const dM = Math.round(dKm*1000)
      // proportional duration from total if fallback else estimate 30 km/h
      const segDur = fallback ? Math.round((dKm/30)*3600) : Math.round((dM/distance)*duration) || Math.round((dKm/20)*3600)
      segmentDetails.push({ from: a.name, to: b.name, distanceM: dM, durationS: segDur })
    }
    if (ordered.length === 1) {
      // metro to single pandal
      const a = { latitude: metroLatitude, longitude: metroLongitude } as any
      const b = ordered[0]
      const dKm = haversineKm(a,{lat:b.latitude,lon:b.longitude})
      segmentDetails.push({ from: metroStation, to: b.name, distanceM: Math.round(dKm*1000), durationS: Math.round((dKm/30)*3600) })
    }

    const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://agomon.vercel.app'
    const agomonUrl = `${base}/pujo-routing/create?pandals=${ordered.map(p=>p.slug).join(',')}&metro=${encodeURIComponent(metroStation)}`
    const waypoints = ordered.map(p=>`${p.latitude},${p.longitude}`).join('|')
    const origin = `${metroLatitude},${metroLongitude}`
    const dest = ordered.length ? `${ordered[ordered.length-1].latitude},${ordered[ordered.length-1].longitude}` : origin
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}${waypoints ? `&waypoints=${waypoints}` : ''}&travelmode=driving`
    const segmentUrls = ordered.length >= 2
      ? ordered.slice(0,-1).map((a,i)=> {
          const b = ordered[i+1]
          return `https://www.google.com/maps/dir/?api=1&origin=${a.latitude},${a.longitude}&destination=${b.latitude},${b.longitude}&travelmode=driving`
        })
      : ordered.length===1 ? [`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=driving`] : []

    // Also include metro->first segment URL separately if multiple
    // segmentUrls already covers pandal-to-pandal; prepend metro->first if needed
    if (ordered.length >= 1) {
      const firstSeg = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${ordered[0].latitude},${ordered[0].longitude}&travelmode=driving`
      // keep segmentUrls as pandal legs, but also provide metroStartUrl
      // We'll add it as first in a combined list for convenience
    }

    return Response.json({
      success: true,
      data: {
        metro: { station: metroStation, latitude: metroLatitude, longitude: metroLongitude },
        stopCount: ordered.length,
        requestedStopCount: stopCount,
        selectedPandalIds,
        verifiedPandals: ordered,
        optimizedOrder: ordered.map(p=>p.id),
        coordinates,
        addresses,
        distances: segmentDetails.map(s=>s.distanceM),
        durations: segmentDetails.map(s=>s.durationS),
        segmentDetails,
        totalDistanceM: distance,
        totalDurationS: duration,
        routeGeometry: geojson,
        fallback,
        agomonUrl,
        agomonPujaRoutingUrl: agomonUrl,
        googleMapsUrl,
        segmentUrls,
        crowdInformation: body.crowdInformation ?? null,
      }
    }, { status: 200, headers: getCorsHeaders(request) })

  } catch (e) {
    // never expose stack
    return Response.json({ success: false, error: { code: 'INTERNAL', message: 'Unexpected error processing route' } }, { status: 500, headers: getCorsHeaders(request) })
  }
}
