// src/lib/pujoRouting.ts — adapted from anujeetverma/PUJO-APP/src/services/osrm.ts (MIT)
// Blended for Agomon web: uses MapLibre-compatible {latitude,longitude}, keeps your #020617/#FFD60A design via caller
export type RoutablePandal = {
  id: string
  name: string
  slug: string
  area: string
  latitude: number
  longitude: number
}

const OSRM_BASE = "https://router.project-osrm.org"

interface OSRMResponse {
  code: string
  trips?: { geometry: { coordinates: [number, number][]; type: string }; distance: number; duration: number }[]
  waypoints?: { waypoint_index: number }[]
}

/**
 * Optimized pandal TSP — fixed start (your location as first item), reorders rest.
 * Mirrors PUJO-APP getOptimizedRoute with source=first & roundtrip=false.
 * Returns GeoJSON-ready coordinates + reordered pandals + totals.
 */
export async function getOptimizedRoute(
  pandals: RoutablePandal[],
  opts?: { roundtrip?: boolean }
): Promise<{
  roadCoordinates: { latitude: number; longitude: number }[]
  optimizedPandals: RoutablePandal[]
  distance: number
  duration: number
  geojson: { type: "FeatureCollection"; features: any[] }
} | null> {
  if (pandals.length < 2) return null

  const coords = pandals.map((p) => `${p.longitude},${p.latitude}`).join(";")
  // roundtrip false = end at last pandal (puja-style), true = loop back to start
  const roundtrip = opts?.roundtrip ? "true" : "false"
  const url = `${OSRM_BASE}/trip/v1/driving/${coords}?overview=full&geometries=geojson&source=first&roundtrip=${roundtrip}`

  const controller = new AbortController()
  const to = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(url, { signal: controller.signal })
    const data: OSRMResponse = await res.json()
    if (data.code !== "Ok" || !data.trips?.[0]) {
      console.error("OSRM Trip failed", data)
      return null
    }
    const trip = data.trips[0]
    const roadCoordinates = trip.geometry.coordinates.map(([lon, lat]) => ({ latitude: lat, longitude: lon }))

    // Reorder pandals via waypoint_index (OSRM returns in original order)
    let optimizedPandals = pandals
    if (data.waypoints && data.waypoints.length === pandals.length) {
      optimizedPandals = data.waypoints
        .map((wp, originalIndex) => ({ originalIndex, optimizedIndex: wp.waypoint_index }))
        .sort((a, b) => a.optimizedIndex - b.optimizedIndex)
        .map((x) => pandals[x.originalIndex])
    }

    const geojson = {
      type: "FeatureCollection" as const,
      features: [{ type: "Feature" as const, geometry: trip.geometry as any, properties: {} }],
    }

    return { roadCoordinates, optimizedPandals, distance: trip.distance, duration: trip.duration, geojson }
  } catch (e) {
    console.error("OSRM network error", e)
    return null
  } finally {
    clearTimeout(to)
  }
}

// Fallback: straight-line nearest-neighbor if OSRM down (keeps UX unblocked — fixes long unresolved spinner)
export function fallbackNearestOrder(pandals: RoutablePandal[]): RoutablePandal[] {
  if (pandals.length <= 2) return pandals
  const [start, ...rest] = pandals
  const ordered: RoutablePandal[] = [start]
  const pool = [...rest]
  let cur = start
  while (pool.length) {
    let bestIdx = 0
    let bestDist = Infinity
    for (let i = 0; i < pool.length; i++) {
      const d = Math.hypot(pool[i].latitude - cur.latitude, pool[i].longitude - cur.longitude)
      if (d < bestDist) {
        bestDist = d
        bestIdx = i
      }
    }
    cur = pool.splice(bestIdx, 1)[0]
    ordered.push(cur)
  }
  return ordered
}
