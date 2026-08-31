// src/lib/crowd.ts:1 - sophisticated crowd prediction using all map-retrievable signals
import { haversineKm, KOLKATA_METROS } from './geo'

// Major malls / eatery hubs in Kolkata (for POI proximity)
const LANDMARKS = [
  { name: 'South City Mall', lat: 22.501, lon: 88.346, type: 'mall', weight: 1.0 },
  { name: 'Acropolis Mall', lat: 22.515, lon: 88.391, type: 'mall', weight: 0.9 },
  { name: 'Quest Mall', lat: 22.544, lon: 88.351, type: 'mall', weight: 0.9 },
  { name: 'City Centre Salt Lake', lat: 22.589, lon: 88.407, type: 'mall', weight: 0.8 },
  { name: 'Mani Square', lat: 22.596, lon: 88.4, type: 'mall', weight: 0.7 },
  { name: 'New Market', lat: 22.56, lon: 88.351, type: 'market', weight: 0.85 },
  { name: 'Park Street Eateries', lat: 22.555, lon: 88.352, type: 'eatery', weight: 0.9 },
  { name: 'Gariahat Market', lat: 22.515, lon: 88.363, type: 'market', weight: 0.8 },
  { name: 'Hatibagan Market', lat: 22.6, lon: 88.374, type: 'market', weight: 0.75 },
  { name: 'Esplanade', lat: 22.562, lon: 88.352, type: 'transit', weight: 0.7 },
  { name: 'Sector V', lat: 22.579, lon: 88.428, type: 'office', weight: 0.6 },
  { name: 'Eco Park', lat: 22.605, lon: 88.433, type: 'park', weight: 0.5 },
]

// Area base POI density (malls/eateries/shops per sqkm heuristic)
const AREA_POI_BASE: Record<string, number> = {
  'South Kolkata': 0.9,
  'Central Kolkata': 0.85,
  'North Kolkata': 0.7,
  'West Kolkata & Behala': 0.6,
  'Dumdum': 0.5,
  'Salt Lake & Rajarhat': 0.65,
}

export type PandalLite = { id: string; latitude: number | null; longitude: number | null; area: string; avg_rating?: number | null }

// Time curve - 6 intervals as per user spec
export const TIME_SLOTS = [
  { label: '4-7 AM', key: '4-7', hours: [4,5,6,7], factor: 0.18, desc: 'Very low' },
  { label: '8-11 AM', key: '8-11', hours: [8,9,10,11], factor: 0.55, desc: 'Moderate' },
  { label: '12-4 PM', key: '12-16', hours: [12,13,14,15,16], factor: 0.82, desc: 'High' },
  { label: '5-8 PM', key: '17-20', hours: [17,18,19,20], factor: 1.0, desc: 'Peak' },
  { label: '9-11 PM', key: '21-23', hours: [21,22,23], factor: 0.92, desc: 'High' },
  { label: '12-3 AM', key: '0-3', hours: [0,1,2,3], factor: 0.35, desc: 'Low' },
]

// Cluster score: weighted count of nearby pandals + density
export function clusterScore(target: PandalLite, all: PandalLite[]): { score: number; nearby: number; density: number } {
  const withCoords = all.filter(p => p.latitude && p.longitude && p.id !== target.id) as (PandalLite & { latitude:number; longitude:number })[]
  if (!target.latitude || !target.longitude) return { score: 0, nearby: 0, density: 0 }
  let weighted = 0
  let nearby = 0
  let density = 0
  for (const p of withCoords) {
    const d = haversineKm({ lat: target.latitude, lon: target.longitude }, { lat: p.latitude, lon: p.longitude })
    if (d <= 2) {
      const w = d <= 0.5 ? 1 : d <= 1 ? 0.6 : 0.3
      weighted += w
      if (d <= 1) nearby++
      density += 1 / (1 + d)
    }
  }
  // normalize 0-1 (max ~8 nearby cluster in South)
  const score = Math.min(1, weighted / 4)
  return { score, nearby, density: Math.min(1, density / 3) }
}

// Landmark / POI score: malls, eateries, transit, parks
export function landmarkScore(target: PandalLite): { score: number; nearest: string; mallDist: number; eateryDist: number; transitDist: number } {
  if (!target.latitude || !target.longitude) return { score: AREA_POI_BASE[target.area] ?? 0.5, nearest: '—', mallDist: 999, eateryDist: 999, transitDist: 999 }
  let mallScore = 0, eateryScore = 0, transitScore = 0, nearest = '—', nearestDist = 999
  for (const lm of LANDMARKS) {
    const d = haversineKm({ lat: target.latitude, lon: target.longitude }, { lat: lm.lat, lon: lm.lon })
    if (d < nearestDist) { nearestDist = d; nearest = lm.name }
    const proximity = Math.max(0, 1 - d / 3) // 0-3km falloff
    if (lm.type === 'mall' || lm.type === 'market') mallScore = Math.max(mallScore, proximity * lm.weight)
    if (lm.type === 'eatery' || lm.type === 'market') eateryScore = Math.max(eateryScore, proximity * lm.weight)
    if (lm.type === 'transit' || lm.type === 'park') transitScore = Math.max(transitScore, proximity * 0.5)
  }
  // metro proximity
  const metros = KOLKATA_METROS.filter(m => haversineKm({ lat: target.latitude!, lon: target.longitude! }, { lat: m.lat, lon: m.lon }) <= 1)
  const metroScore = Math.min(1, metros.length * 0.4)
  // area base
  const base = AREA_POI_BASE[target.area] ?? 0.5
  // weighted POI 0-1
  const score = Math.min(1, base * 0.3 + mallScore * 0.3 + eateryScore * 0.25 + metroScore * 0.15)
  const mallDist = Math.min(...LANDMARKS.filter(l=>l.type==='mall').map(l=>haversineKm({lat:target.latitude!,lon:target.longitude!},{lat:l.lat,lon:l.lon})))
  const eateryDist = Math.min(...LANDMARKS.filter(l=>l.type==='eatery'||l.type==='market').map(l=>haversineKm({lat:target.latitude!,lon:target.longitude!},{lat:l.lat,lon:l.lon})))
  const transitDist = metros.length ? Math.min(...metros.map(m=>haversineKm({lat:target.latitude!,lon:target.longitude!},{lat:m.lat,lon:m.lon}))) : 999
  return { score, nearest, mallDist, eateryDist, transitDist }
}

// Road/building density proxy: use area + cluster density
export function urbanDensityScore(target: PandalLite, clusterDensity: number): number {
  const areaUrban: Record<string, number> = {
    'Central Kolkata': 1.0, 'South Kolkata': 0.9, 'North Kolkata': 0.85, 'West Kolkata & Behala': 0.7, 'Dumdum': 0.6, 'Salt Lake & Rajarhat': 0.75,
  }
  return Math.min(1, (areaUrban[target.area] ?? 0.6) * 0.5 + clusterDensity * 0.5)
}

export function predictCrowd(target: PandalLite, all: PandalLite[], hour: number): number {
  const timeSlot = TIME_SLOTS.find(s => s.hours.includes(hour)) || TIME_SLOTS[3]
  const timeFactor = timeSlot.factor
  const { score: cluster, density } = clusterScore(target, all)
  const { score: poi } = landmarkScore(target)
  const urban = urbanDensityScore(target, density)
  const ratingNorm = Math.min(1, ((target.avg_rating ?? 4.2) - 3.5) / 1.5) // 3.5-5 -> 0-1
  // weighted 0-100
  const raw = cluster * 25 + poi * 25 + urban * 15 + timeFactor * 35 + ratingNorm * 5
  // add slight randomness for realism (deterministic via id char)
  const jitter = ((target.id.charCodeAt(0) % 10) - 5) * 0.5
  return Math.max(5, Math.min(98, Math.round(raw + jitter)))
}

export function predictAllSlots(target: PandalLite, all: PandalLite[]): { label: string; score: number; desc: string }[] {
  return TIME_SLOTS.map(slot => {
    const midHour = slot.hours[Math.floor(slot.hours.length / 2)]
    return { label: slot.label, score: predictCrowd(target, all, midHour), desc: slot.desc }
  })
}
