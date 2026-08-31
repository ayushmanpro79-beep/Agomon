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

// Landmark / POI score: malls, eateries, transit, parks — with open-hours factor (8-10am open, 9-11pm close)
function openFactor(hour: number, type: string): number {
  if (type === 'mall' || type === 'market') {
    if (hour < 8) return 0.1
    if (hour < 10) return 0.6 + (hour - 8) * 0.2 // 8-10 ramp
    if (hour < 21) return 1.0
    if (hour < 23) return 0.6 - (hour - 21) * 0.2 // 9-11 wind down
    return 0.05
  }
  if (type === 'eatery') {
    if (hour < 8) return 0.15
    if (hour < 10) return 0.7
    if (hour < 23) return 1.0 // eateries open late
    return 0.2
  }
  return 1 // transit/park always
}

export function landmarkScore(target: PandalLite, hour = 12): { score: number; nearest: string; mallDist: number; eateryDist: number; transitDist: number } {
  if (!target.latitude || !target.longitude) return { score: AREA_POI_BASE[target.area] ?? 0.5, nearest: '—', mallDist: 999, eateryDist: 999, transitDist: 999 }
  let mallScore = 0, eateryScore = 0, transitScore = 0, nearest = '—', nearestDist = 999
  for (const lm of LANDMARKS) {
    const d = haversineKm({ lat: target.latitude, lon: target.longitude }, { lat: lm.lat, lon: lm.lon })
    if (d < nearestDist) { nearestDist = d; nearest = lm.name }
    const proximity = Math.max(0, 1 - d / 3)
    const open = openFactor(hour, lm.type)
    if (lm.type === 'mall' || lm.type === 'market') mallScore = Math.max(mallScore, proximity * lm.weight * open)
    if (lm.type === 'eatery' || lm.type === 'market') eateryScore = Math.max(eateryScore, proximity * lm.weight * open)
    if (lm.type === 'transit' || lm.type === 'park') transitScore = Math.max(transitScore, proximity * 0.5 * open)
  }
  const metros = KOLKATA_METROS.filter(m => haversineKm({ lat: target.latitude!, lon: target.longitude! }, { lat: m.lat, lon: m.lon }) <= 1)
  const metroScore = Math.min(1, metros.length * 0.4)
  const base = AREA_POI_BASE[target.area] ?? 0.5
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

// MapChecking-style area capacity: estimate pandal ground area from cluster + area
function mapCheckingArea(target: PandalLite): number {
  // heuristic: pandal ground ~ 30x40m = 1200m2, larger if in market/mall cluster
  const { score: poi } = landmarkScore(target, 18) // peak hour poi
  const base = 1200
  const extra = poi * 800 // malls add space
  return base + extra // 1200-2000 m2
}

export function predictCrowd(target: PandalLite, all: PandalLite[], hour: number): number {
  // hour can be 0-23.99 float for 100-slot precision
  const hi = Math.floor(hour) % 24
  const timeSlot = TIME_SLOTS.find(s => s.hours.includes(hi)) || TIME_SLOTS[3]
  let timeFactor = timeSlot.factor
  // lunch dip 12-2pm: acute 30% drop, Indians prefer lunch
  if (hour >= 12 && hour < 13) timeFactor *= 0.72
  else if (hour >= 13 && hour < 14) timeFactor *= 0.68
  else if (hour >= 14 && hour < 14.5) timeFactor *= 0.78 // sharp recovery
  const { score: cluster, density } = clusterScore(target, all)
  const { score: poi } = landmarkScore(target, hi)
  const urban = urbanDensityScore(target, density)
  const ratingNorm = Math.min(1, ((target.avg_rating ?? 4.2) - 3.5) / 1.5)
  const area = mapCheckingArea(target)
  const maxCap = area * 2.5
  // near malls: irregular pattern (rest/visit mall) - add wavy noise if poi high and near mall
  const isNearMall = poi > 0.6
  let irregular = 0
  if (isNearMall) {
    const hash = target.id.charCodeAt(0) + target.id.charCodeAt(1)
    irregular = Math.sin(hour * 1.8 + hash) * 4 + Math.cos(hour * 3.1) * 2 // -6 to +6, jagged
  }
  const crowdFactor = cluster * 0.3 + poi * 0.35 + urban * 0.15 + timeFactor * 0.2
  const raw = crowdFactor * 85 + ratingNorm * 10 + (maxCap / 2000) * 5 + irregular
  const jitter = ((target.id.charCodeAt(0) % 10) - 5) * 0.3
  return Math.max(5, Math.min(98, Math.round(raw + jitter)))
}

export function predictAllSlots(target: PandalLite, all: PandalLite[]): { label: string; score: number; desc: string }[] {
  return TIME_SLOTS.map(slot => {
    const midHour = slot.hours[Math.floor(slot.hours.length / 2)]
    return { label: slot.label, score: predictCrowd(target, all, midHour), desc: slot.desc }
  })
}

// 100-slot high-precision (14.4min each) - for bar graph only, no numbers
export function predict100Slots(target: PandalLite, all: PandalLite[]): number[] {
  const scores: number[] = []
  for (let i = 0; i < 100; i++) {
    const hour = (i * 24) / 100 // 0 .. 23.76
    scores.push(predictCrowd(target, all, hour))
  }
  return scores
}
