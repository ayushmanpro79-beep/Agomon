// src/lib/searchEngine.ts:1 - unified search: area, station 4-5km, pandal fuzzy + accuracy, random area 3.5km
import Fuse from 'fuse.js'
import { haversineKm } from './geo'
import { STATIONS } from './trainStations'

type Pandal = { id: string; name: string; slug: string; area: string; address: string | null; latitude: number | null; longitude: number | null }

const AREAS = ['North Kolkata','Dumdum','South Kolkata','West Kolkata & Behala','Central Kolkata','Salt Lake & Rajarhat'].map(a=>a.toLowerCase())

const areaFuse = new Fuse(AREAS, { threshold: 0.4 })
const stationFuse = new Fuse(STATIONS, { keys: ['name'], threshold: 0.6, includeScore: true })

let geocodeCache = new Map<string, { lat:number; lon:number; display:string }>()
let pandalFuse: Fuse<Pandal> | null = null

function getPandalFuse(pandals: Pandal[]): Fuse<Pandal> {
  if (!pandalFuse) {
    pandalFuse = new Fuse(pandals, { keys: ['name','slug','area'], threshold: 0.4, includeScore: true })
  }
  return pandalFuse
}

export type SearchResult = { pandals: Pandal[]; meta: string; accuracy?: number; isRandomArea?: boolean }

export async function searchEngine(query: string, allPandals: Pandal[]): Promise<SearchResult> {
  const q = query.trim().toLowerCase()
  if (!q) return { pandals: allPandals, meta: 'All' }

  // 1. Area exact (south kolkata etc)
  if (AREAS.includes(q)) {
    const areaReal = allPandals.find(p=>p.area.toLowerCase()===q)?.area || q
    return { pandals: allPandals.filter(p=>p.area.toLowerCase()===q), meta: `Area: ${areaReal}` }
  }
  const areaHit = areaFuse.search(q)
  if (areaHit.length && areaHit[0].score! < 0.3) {
    const area = areaHit[0].item
    return { pandals: allPandals.filter(p=>p.area.toLowerCase()===area), meta: `Area: ${area}` }
  }

  // 2. Station 4-5km (metro + local) — North stations like Sovabazar/Shyambazar with typos
  const stationHits = stationFuse.search(q)
  if (stationHits.length && stationHits[0].score! < 0.6) {
    const st = stationHits[0].item
    const filtered = allPandals.filter(p=>p.latitude&&p.longitude&& haversineKm({lat:st.lat,lon:st.lon},{lat:p.latitude!,lon:p.longitude!}) <= 4.5)
    if (filtered.length) {
      const acc = Math.round((1 - (stationHits[0].score||0))*100)
      return { pandals: filtered, meta: `Near ${st.name} (${st.type}) • 4.5km`, accuracy: acc }
    }
  }

  // 3. Pandal fuzzy + accuracy meter (e.g., chtla -> chetla)
  const pf = getPandalFuse(allPandals)
  const pandalHits = pf.search(q)
  if (pandalHits.length && pandalHits[0].score! < 0.5) {
    const acc = Math.round((1 - (pandalHits[0].score||0))*100)
    // return top 8 fuzzy
    const res = pandalHits.slice(0,8).map(h=>h.item)
    return { pandals: res, meta: `Fuzzy: ${pandalHits[0].item.name}`, accuracy: acc }
  }

  // 4. Random area 3.5km via Nominatim (tollygunge, golf club etc)
  try {
    let geo = geocodeCache.get(q)
    if (!geo) {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', Kolkata, India')}&format=json&limit=1`
      const res = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': 'Agomon/1.0' } })
      const data = await res.json()
      if (data[0]) {
        geo = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), display: data[0].display_name }
        geocodeCache.set(q, geo)
      }
    }
    if (geo) {
      const filtered = allPandals.filter(p=>p.latitude&&p.longitude&& haversineKm({lat:geo.lat,lon:geo.lon},{lat:p.latitude!,lon:p.longitude!}) <= 3.5)
      if (filtered.length) return { pandals: filtered, meta: `Near ${query} • 3.5km`, isRandomArea: true }
    }
  } catch {}

  // fallback: simple includes
  const fallback = allPandals.filter(p=>p.name.toLowerCase().includes(q) || p.area.toLowerCase().includes(q))
  return { pandals: fallback, meta: fallback.length ? `Search: ${query}` : `No match` }
}

export function resetFuseCache() { pandalFuse = null }
