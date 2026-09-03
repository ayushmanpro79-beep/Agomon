// src/lib/searchEngine.ts: sophisticated OSM-first search
// Order: 1) area alias (rajarhat -> Salt Lake), 2) area fuzzy strict, 3) OSM geocode (area vs place radius), 4) station strict, 5) pandal fuzzy, 6) fallback
import Fuse from 'fuse.js'
import { haversineKm } from './geo'
import { STATIONS } from './trainStations'

type Pandal = { id: string; name: string; slug: string; area: string; address: string | null; latitude: number | null; longitude: number | null }

export const AREAS = ['North Kolkata','Dumdum','South Kolkata','West Kolkata & Behala','Central Kolkata','Salt Lake & Rajarhat']

// canonical lower -> proper case
const AREA_PROPER: Record<string,string> = {}
AREAS.forEach(a=> { AREA_PROPER[a.toLowerCase()] = a })
const AREAS_LOWER = AREAS.map(a=>a.toLowerCase())

// Aliases -> canonical lower. Sorted by length desc to prefer longer match.
// Only distinctive aliases; single generic words like "south"/"west" removed to avoid "South City Mall" false area match.
const AREA_ALIAS_MAP: Record<string,string> = {
  // Salt Lake & Rajarhat cluster
  'salt lake & rajarhat': 'salt lake & rajarhat',
  'rajarhat gopalpur': 'salt lake & rajarhat',
  'rajarhat': 'salt lake & rajarhat',
  'new town': 'salt lake & rajarhat',
  'newtown': 'salt lake & rajarhat',
  'bidhannagar': 'salt lake & rajarhat',
  'salt lake': 'salt lake & rajarhat',
  'saltlake': 'salt lake & rajarhat',
  'sector v': 'salt lake & rajarhat',
  'sector 5': 'salt lake & rajarhat',
  'karunamoyee': 'salt lake & rajarhat',
  // Dumdum
  'dum dum': 'dumdum',
  'dumdum': 'dumdum',
  // Area full names only - avoid generic single-word aliases
  'south kolkata': 'south kolkata',
  'west kolkata & behala': 'west kolkata & behala',
  'west kolkata': 'west kolkata & behala',
  'behala': 'west kolkata & behala',
  'central kolkata': 'central kolkata',
  'esplanade': 'central kolkata',
  'park street': 'central kolkata',
  'north kolkata': 'north kolkata',
}

const ALIAS_ENTRIES = Object.entries(AREA_ALIAS_MAP).sort((a,b)=> b[0].length - a[0].length)

function matchAreaAlias(q: string): string | null {
  const qq = q.trim().toLowerCase().replace(/\s+/g,' ')
  if (AREA_ALIAS_MAP[qq]) return AREA_ALIAS_MAP[qq]
  for (const [alias, canonical] of ALIAS_ENTRIES) {
    if (alias.length < 3) continue
    // Use word-boundary regex to avoid "south" matching "south city mall"
    // For single-word aliases like "behala", ensure whole word match
    const re = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
    if (re.test(qq)) {
      // For very short aliases (<5 chars) require exact, but we removed those; keep guard
      if (alias.length <= 4 && qq !== alias) continue
      return canonical
    }
  }
  return null
}

const areaFuse = new Fuse(AREAS_LOWER, { threshold: 0.32, includeScore: true })
const stationFuse = new Fuse(STATIONS, { keys: ['name'], threshold: 0.35, includeScore: true })

type GeoCacheEntry = { lat:number; lon:number; display:string; addresstype?: string; cls?: string; type?: string; bbox?: [number,number,number,number] }
let geocodeCache = new Map<string, GeoCacheEntry | null>()
let pandalFuse: Fuse<Pandal> | null = null
let pandalFuseSize = -1

function getPandalFuse(pandals: Pandal[]): Fuse<Pandal> {
  // Rebuild when dataset changes (admin add/edit) — old cache hid new pandals like Tridhara
  if (!pandalFuse || pandalFuseSize !== pandals.length) {
    pandalFuse = new Fuse(pandals, { keys: ['name','slug','area'], threshold: 0.42, includeScore: true, ignoreLocation: true })
    pandalFuseSize = pandals.length
  }
  return pandalFuse
}

// Kolkata center + bbox for filtering OSM
const KOLKATA_CENTER = { lat: 22.5726, lon: 88.3639 }
// viewbox for Nominatim: minLon, maxLat, maxLon, minLat (approx 35km square)
const VIEWBOX = '88.18,22.80,88.55,22.40'

const AREA_TYPES = new Set(['suburb','neighbourhood','quarter','city_district','borough','subdivision','residential','city','town','village','hamlet'])
const PLACE_RADIUS_KM = 2.5
const PLACE_FALLBACK_RADIUS_KM = 3 // user spec: if not railway=station then place=suburb/town/neighbourhood etc → 3km
const AREA_RADIUS_KM = 6
const PLACE_TYPES_3KM = new Set(['suburb','town','neighbourhood','quarter','city_district','borough','village','hamlet','residential','city'])

function isRailwayStation(entry: any): boolean {
  const cls = (entry.cls || entry.class || '').toLowerCase()
  const type = (entry.type || '').toLowerCase()
  return cls === 'railway' && ['station','halt'].includes(type)
}

function isPlaceFallbackType(entry: any): boolean {
  const addresstype = (entry.addresstype || entry.type || '').toLowerCase()
  const cls = (entry.cls || entry.class || '').toLowerCase()
  const type = (entry.type || '').toLowerCase()
  if (PLACE_TYPES_3KM.has(addresstype)) return true
  if (PLACE_TYPES_3KM.has(type)) return true
  if (cls === 'place' && PLACE_TYPES_3KM.has(type)) return true
  return false
}

function isAreaLike(entry: any): boolean {
  const addresstype = (entry.addresstype || entry.type || '').toLowerCase()
  const cls = (entry.cls || entry.class || '').toLowerCase()
  const type = (entry.type || '').toLowerCase()
  if (AREA_TYPES.has(addresstype)) return true
  if (AREA_TYPES.has(type)) return true
  if (cls === 'boundary' && type === 'administrative') return true
  if (cls === 'place' && ['suburb','neighbourhood','quarter','city_district','borough'].includes(type)) return true
  // boundingbox significantly larger than a building -> area (handle both bbox and boundingbox keys)
  const rawBbox = entry.bbox || entry.boundingbox
  if (rawBbox) {
    const nums = rawBbox.map((v:any)=> typeof v === 'string' ? parseFloat(v) : v)
    const [s,n,w,e] = nums
    const dLat = Math.abs(n - s) * 111
    const dLon = Math.abs(e - w) * 111 * Math.cos((n*Math.PI/180))
    const diag = Math.sqrt(dLat*dLat + dLon*dLon)
    if (diag > 1.5) return true
    // parks with ~2km diagonal are area-like (Eco Park)
    if (cls === 'leisure' && type === 'park' && diag > 1.2) return true
  }
  // leisure=park, tourism, etc. large features are area-like
  if (cls === 'leisure' && ['park','common'].includes(type)) return true
  return false
}

function isKolkataResult(entry: any): boolean {
  const lat = parseFloat(entry.lat), lon = parseFloat(entry.lon)
  const display = (entry.display_name || '').toLowerCase()
  const addr = entry.address || {}
  const state = (addr.state || '').toLowerCase()
  const country = (addr.country_code || '').toLowerCase()
  if (country && country !== 'in') return false
  if (display && !display.includes('west bengal') && !display.includes('kolkata') && !display.includes('bidhan') && !display.includes('north 24') && !display.includes('south 24')) {
    // still allow if within 25km of center
  }
  if (state && state !== 'west bengal') {
    // allow Bidhannagar etc still West Bengal, but if other state reject
    if (!['west bengal'].includes(state)) return false
  }
  const dist = haversineKm(KOLKATA_CENTER, {lat, lon})
  if (dist > 30) return false
  return true
}

async function geocodeOSM(query: string): Promise<GeoCacheEntry | null> {
  const qKey = query.trim().toLowerCase()
  if (geocodeCache.has(qKey)) return geocodeCache.get(qKey)!
  try {
    // bias to Kolkata, 5 results to pick best Kolkata-ish
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', Kolkata, India')}&format=json&limit=5&addressdetails=1&viewbox=${VIEWBOX}&bounded=0&countrycodes=in`
    const res = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': 'Agomon/1.0 (agomon.kolkata@gmail.com)' } as any })
    if (!res.ok) throw new Error(`Nominatim ${res.status}`)
    const data: any[] = await res.json()
    if (!data.length) { geocodeCache.set(qKey, null); return null }
    // filter to Kolkata, sort by importance
    const filtered = data.filter(isKolkataResult)
    const candidates = filtered.length ? filtered : data
    candidates.sort((a,b)=> (b.importance||0) - (a.importance||0))
    const best = candidates[0]
    if (!best) { geocodeCache.set(qKey, null); return null }
    // double-check Kolkata proximity for best even if filtered empty
    const lat = parseFloat(best.lat), lon = parseFloat(best.lon)
    if (haversineKm(KOLKATA_CENTER, {lat, lon}) > 35) { geocodeCache.set(qKey, null); return null }
    const entry: GeoCacheEntry = {
      lat, lon,
      display: best.display_name,
      addresstype: best.addresstype,
      cls: best.class,
      type: best.type,
      bbox: best.boundingbox ? best.boundingbox.map((v:string)=>parseFloat(v)) as any : undefined,
    }
    geocodeCache.set(qKey, entry)
    return entry
  } catch {
    geocodeCache.set(qKey, null)
    return null
  }
}

export type SearchResult = { pandals: Pandal[]; meta: string; accuracy?: number; isRandomArea?: boolean }

export async function searchEngine(query: string, allPandals: Pandal[]): Promise<SearchResult> {
  const q = query.trim().toLowerCase().replace(/\s+/g,' ')
  if (!q) return { pandals: allPandals, meta: 'All' }

  // 1. Area alias (rajarhat -> Salt Lake & Rajarhat) - instant, no API
  const alias = matchAreaAlias(q)
  if (alias) {
    const proper = AREA_PROPER[alias] || alias
    const filtered = allPandals.filter(p=> p.area.toLowerCase() === alias)
    if (filtered.length) return { pandals: filtered, meta: `Area: ${proper}` }
    // if no pandals with exact area but alias matched, fall through to OSM spatial
  }

  // 2. Area exact / strict fuzzy
  if (AREAS_LOWER.includes(q)) {
    const proper = AREA_PROPER[q] || q
    return { pandals: allPandals.filter(p=>p.area.toLowerCase()===q), meta: `Area: ${proper}` }
  }
  const areaHit = areaFuse.search(q)
  if (areaHit.length && areaHit[0].score! < 0.30) {
    const area = areaHit[0].item
    const proper = AREA_PROPER[area] || area
    return { pandals: allPandals.filter(p=>p.area.toLowerCase()===area), meta: `Area: ${proper}` }
  }

  // 3. Station exact (no fuzzy) - prioritize true station names before OSM area
  const qNormExact = q.replace(/[^a-z0-9]/g,'')
  const exactStation = STATIONS.find(s=> s.name.toLowerCase().replace(/[^a-z0-9]/g,'') === qNormExact || s.name.toLowerCase() === q)
  if (exactStation) {
    const filtered = allPandals.filter(p=>p.latitude!=null && p.longitude!=null && haversineKm({lat:exactStation.lat,lon:exactStation.lon},{lat:p.latitude!,lon:p.longitude!}) <= 2.3)
    if (filtered.length) return { pandals: filtered, meta: `Near ${exactStation.name} (${exactStation.type}) • 2.3km`, accuracy: 100 }
  }

  // 4. OSM geocode - Kolkata-bounded, railway=station check → place fallback 3km
  const geo = await geocodeOSM(query)
  if (geo) {
    // User spec: if not railway=station then check place=suburb/town/neighbourhood etc → 3km
    const isRailway = isRailwayStation(geo as any)
    if (isRailway) {
      // railway station already handled via exact/fuzzy STATIONS above, but OSM railway still valid
      const radius = 2.2
      const filtered = allPandals.filter(p=> p.latitude!=null && p.longitude!=null && haversineKm({lat:geo.lat,lon:geo.lon},{lat:p.latitude!,lon:p.longitude!}) <= radius)
      if (filtered.length) {
        const label = geo.display.split(',')[0] || query
        return { pandals: filtered, meta: `Near ${label} • station • ${radius}km` }
      }
    }
    const isPlaceFallback = !isRailway && isPlaceFallbackType(geo as any)
    if (isPlaceFallback) {
      const radius = PLACE_FALLBACK_RADIUS_KM
      const filtered = allPandals.filter(p=> p.latitude!=null && p.longitude!=null && haversineKm({lat:geo.lat,lon:geo.lon},{lat:p.latitude!,lon:p.longitude!}) <= radius)
      if (filtered.length) {
        const label = geo.display.split(',')[0] || query
        return { pandals: filtered, meta: `Near ${label} • place • ${radius}km` }
      }
    }
    const areaLike = isAreaLike(geo as any)
    const radius = areaLike ? AREA_RADIUS_KM : PLACE_RADIUS_KM
    const filtered = allPandals.filter(p=> p.latitude!=null && p.longitude!=null && haversineKm({lat:geo.lat,lon:geo.lon},{lat:p.latitude!,lon:p.longitude!}) <= radius)
    if (filtered.length) {
      const label = geo.display.split(',')[0] || query
      const kind = areaLike ? 'area' : 'place'
      return { pandals: filtered, meta: `Near ${label} • ${kind} • ${radius}km`, isRandomArea: areaLike }
    }
    // if areaLike but no pandals in radius, also try alias from OSM suburb name
    if (areaLike) {
      const suburb = (geo.display.split(',')[0] || '').toLowerCase()
      const alias2 = matchAreaAlias(suburb)
      if (alias2) {
        const proper = AREA_PROPER[alias2] || alias2
        const byArea = allPandals.filter(p=> p.area.toLowerCase()===alias2)
        if (byArea.length) return { pandals: byArea, meta: `Area: ${proper} (via ${suburb})` }
      }
    }
  }

  // 5. Station strict fuzzy (threshold 0.35) + token guard
  const stationHits = stationFuse.search(query)
  if (stationHits.length && stationHits[0].score! < 0.35) {
    // token guard: require query substring of station or vice versa for very short queries
    const top = stationHits[0]
    const stName = top.item.name.toLowerCase()
    const qNorm = q.replace(/[^a-z0-9]/g,'')
    const stNorm = stName.replace(/[^a-z0-9]/g,'')
    const tokenOk = qNorm.length >= 3 && (stNorm.includes(qNorm) || qNorm.includes(stNorm) || top.score! < 0.25)
    if (tokenOk) {
      const st = top.item
      const filtered = allPandals.filter(p=>p.latitude!=null && p.longitude!=null && haversineKm({lat:st.lat,lon:st.lon},{lat:p.latitude!,lon:p.longitude!}) <= 2.3)
      if (filtered.length) {
        const acc = Math.round((1 - (top.score||0))*100)
        return { pandals: filtered, meta: `Near ${st.name} (${st.type}) • 2.3km`, accuracy: acc }
      }
    }
  }

  // 6. Pandal fuzzy (threshold 0.42 - allows chtla->chetla 0.400)
  const pf = getPandalFuse(allPandals)
  const pandalHits = pf.search(query)
  if (pandalHits.length && pandalHits[0].score! < 0.42) {
    const acc = Math.round((1 - (pandalHits[0].score||0))*100)
    const res = pandalHits.slice(0,8).map(h=>h.item)
    return { pandals: res, meta: `Pandal: ${pandalHits[0].item.name}`, accuracy: acc }
  }

  // fallback: simple includes
  const fallback = allPandals.filter(p=>p.name.toLowerCase().includes(q) || p.area.toLowerCase().includes(q))
  return { pandals: fallback, meta: fallback.length ? `Search: ${query}` : `No match for "${query}"` }
}

export function resetFuseCache() { pandalFuse = null; pandalFuseSize = -1; geocodeCache.clear() }
