// src/lib/travelRouter.ts — port of Akash190104/kolkata-travel-router build.py find() + canon + fare/time
// Data: data/busdata.json (1919 routes, 2233 stops) + HUB metro connections
// Credit: Kolkata Travel Router by Akash190104 — https://github.com/Akash190104/kolkata-travel-router
import busdata from '@/../data/busdata.json'
import { haversineKm } from './geo'
import { predictCrowd } from './crowd'

// Bus/Metro rates: data/busRates.json + data/metroRates.json (copied from bus rates.txt / metro rates.txt)
import busRates from '@/../data/busRates.json'
import metroRates from '@/../data/metroRates.json'

function fareBus(km: number, isAC = false): number {
  if (km <= 0) return isAC ? (busRates as any).ac_minimum : 7
  const ordinaryFare = (() => {
    if (km <= 4) return 7
    if (km <= 8) return 9
    if (km <= 12) return 9
    if (km <= 16) return 10
    if (km <= 20) return 17
    if (km <= 24) return 21
    const extra = Math.ceil((km - 24) / 4)
    return 21 + extra
  })()
  if (isAC) return Math.max((busRates as any).ac_minimum as number, ordinaryFare + 8)
  return ordinaryFare
}
function fareMetro(stns: number): number {
  for (const slab of (metroRates as any).slabs) {
    const [lo, hi] = slab.stations as [number, number | null]
    if (hi === null ? stns >= lo : stns >= lo && stns <= hi) return slab.fare as number
  }
  return 30
}

type Route = { code: string; kind: string; stops: string[]; scope?: string; directional?: boolean; towards?: string }
const routes = busdata.routes as Route[]
const stopsList = (busdata.stops as { name: string }[]).map(s => s.name)
const aliasMap = busdata.aliases as Record<string, string>

// Build indices like build.py
const stopRoutes = new Map<string, Set<number>>()
routes.forEach((r, i) => {
  new Set(r.stops).forEach(s => {
    if (!stopRoutes.has(s)) stopRoutes.set(s, new Set())
    stopRoutes.get(s)!.add(i)
  })
})
const routeSet = routes.map(r => new Set(r.stops))
const routeAdj = new Map<number, Set<number>>()
stopRoutes.forEach(set => {
  const arr = [...set]
  for (let a = 0; a < arr.length; a++) for (let b = a + 1; b < arr.length; b++) {
    if (!routeAdj.has(arr[a])) routeAdj.set(arr[a], new Set())
    if (!routeAdj.has(arr[b])) routeAdj.set(arr[b], new Set())
    routeAdj.get(arr[a])!.add(arr[b])
    routeAdj.get(arr[b])!.add(arr[a])
  }
})

// canon stripped down — reuse build.py canon via busdata aliases; for unknown, lower + alias lookup
function canon(raw: string): string {
  const key = raw.toLowerCase().trim().replace(/\s+/g, ' ')
  if (aliasMap[key]) return aliasMap[key]
  const lower = raw.toLowerCase().replace(/\bno\.?\b/g, 'no').trim()
  for (const [k, v] of Object.entries(aliasMap)) if (key === k.toLowerCase()) return v
  // Title case fallback
  return raw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ').trim()
}

function idx(r: number, s: string) { return routes[r].stops.indexOf(s) }
function canRide(r: number, a: string, b: string) {
  if (!routeSet[r].has(a) || !routeSet[r].has(b)) return false
  if (routes[r].directional) return idx(r, a) <= idx(r, b)
  return true
}
function rideCost(r: number, a: string, b: string) {
  if (!canRide(r, a, b)) return 1e9
  const i = idx(r, a), j = idx(r, b)
  return routes[r].directional ? j - i : Math.abs(i - j)
}
function seg(r: number, a: string, b: string): string[] {
  const i = idx(r, a), j = idx(r, b)
  if (routes[r].directional && i > j) return []
  const st = routes[r].stops
  return i <= j ? st.slice(i, j + 1) : st.slice(j, i + 1).reverse()
}
function shared(r1: number, r2: number) {
  const s = new Set<string>()
  routeSet[r1].forEach(v => { if (routeSet[r2].has(v)) s.add(v) })
  return s
}
function usesMetro(...ids: number[]) { return ids.some(i => routes[i].kind === 'metro') }
function metroCount(...ids: number[]) { return ids.filter(i => routes[i].kind === 'metro').length }
function scopeCost(r: number) {
  if (routes[r].kind === 'metro') return 0
  return routes[r].scope === 'regional' ? 3 : 1
}

export type Leg = { route: string; kind: string; from: string; to: string; towards: string; stops: string[] }
export type Plan = { legs: Leg[]; cost: number; timeMin: number; fare: number; kind: 'bus'|'metro'|'mixed' }

function estimateTime(legs: Leg[]): number {
  // 18 km/h bus avg, 1.8m per metro stn, walk not in legs
  let t = 0
  for (const l of legs) {
    const hops = l.stops.length - 1
    if (l.kind === 'metro') t += hops * 1.8 + 2 // transfer
    else t += hops * 2.2 + 3 // bus hops + wait
  }
  return Math.round(t)
}
function estimateFare(legs: Leg[]): number {
  let total = 0
  for (const l of legs) {
    const hops = l.stops.length - 1
    if (l.kind === 'metro') total += fareMetro(hops)
    else {
      const km = hops * 0.85 // avg inter-stop 0.85km Kolkata
      total += fareBus(km, l.route.toLowerCase().includes('ac'))
    }
  }
  return total
}
function legKind(legs: Leg[]): 'bus'|'metro'|'mixed' {
  const hasMetro = legs.some(l => l.kind === 'metro')
  const hasBus = legs.some(l => l.kind !== 'metro')
  if (hasMetro && hasBus) return 'mixed'
  if (hasMetro) return 'metro'
  return 'bus'
}

export function findRoutes(originRaw: string, destRaw: string) {
  const o = canon(originRaw), d = canon(destRaw)
  if (!stopRoutes.has(o) || !stopRoutes.has(d)) return { error: 'unknown stop', origin: o, dest: d, direct: [], one: [], two: [] } as any
  const start = stopRoutes.get(o)!, end = stopRoutes.get(d)!
  const out: any = { origin: o, dest: d, direct: [], one: [], two: [] }

  // direct
  const directRoutes = [...start].filter(r => end.has(r) && canRide(r, o, d))
  for (const r of directRoutes.sort((a, b) => (usesMetro(a) ? -1 : 1) || scopeCost(a) - scopeCost(b) || rideCost(a, o, d) - rideCost(b, o, d))) {
    const legs: Leg[] = [{ route: routes[r].code, kind: routes[r].kind, from: o, to: d, towards: routes[r].towards || routes[r].stops[routes[r].stops.length - 1], stops: seg(r, o, d) }]
    out.direct.push({ legs, cost: rideCost(r, o, d), timeMin: estimateTime(legs), fare: estimateFare(legs), kind: legKind(legs) })
  }
  // one transfer
  const seen = new Set<string>()
  const cands: any[] = []
  for (const r1 of start) for (const r2 of end) {
    if (r1 === r2) continue
    if (!routeAdj.get(r1)?.has(r2)) continue
    const inter = [...shared(r1, r2)].map(t => ({ t, cost: canRide(r1, o, t) && canRide(r2, t, d) ? rideCost(r1, o, t) + rideCost(r2, t, d) : 1e9 })).filter(x => x.cost < 1e9).sort((a, b) => a.cost - b.cost)[0]
    if (!inter || [o, d].includes(inter.t)) continue
    const key = `${r1}-${r2}-${inter.t}`
    if (seen.has(key)) continue; seen.add(key)
    cands.push({ r1, r2, t: inter.t, cost: inter.cost })
  }
  for (const { r1, r2, t, cost } of cands.sort((a, b) => a.cost - b.cost).slice(0, 10)) {
    const legs: Leg[] = [
      { route: routes[r1].code, kind: routes[r1].kind, from: o, to: t, towards: routes[r1].towards || '', stops: seg(r1, o, t) },
      { route: routes[r2].code, kind: routes[r2].kind, from: t, to: d, towards: routes[r2].towards || '', stops: seg(r2, t, d) },
    ]
    out.one.push({ legs, cost, timeMin: estimateTime(legs), fare: estimateFare(legs), kind: legKind(legs) })
  }
  // two transfers if few results
  if (out.direct.length + out.one.length < 4) {
    const seen2 = new Set<string>()
    const c2: any[] = []
    for (const r1 of start) for (const r3 of end) {
      if (r1 === r3) continue
      const mids = [...(routeAdj.get(r1) || [])].filter(m => routeAdj.get(m)?.has(r3))
      for (const r2 of mids) {
        if ([r1, r3].includes(r2) || start.has(r2) || end.has(r2)) continue
        const key = `${r1}-${r2}-${r3}`
        if (seen2.has(key)) continue
        // brute pick best t1 in r1&r2, t2 in r2&r3
        let best: any = null, bestCost = 1e9
        for (const a of shared(r1, r2)) for (const b of shared(r2, r3)) {
          if (new Set([o, a, b, d]).size < 4) continue
          if (!canRide(r1, o, a) || !canRide(r2, a, b) || !canRide(r3, b, d)) continue
          const cc = rideCost(r1, o, a) + rideCost(r2, a, b) + rideCost(r3, b, d)
          if (cc < bestCost) { bestCost = cc; best = { a, b } }
        }
        if (!best) continue
        seen2.add(key); c2.push({ r1, r2, r3, a: best.a, b: best.b, cost: bestCost })
      }
    }
    for (const { r1, r2, r3, a, b, cost } of c2.sort((x, y) => x.cost - y.cost).slice(0, 6)) {
      const legs: Leg[] = [
        { route: routes[r1].code, kind: routes[r1].kind, from: o, to: a, towards: '', stops: seg(r1, o, a) },
        { route: routes[r2].code, kind: routes[r2].kind, from: a, to: b, towards: '', stops: seg(r2, a, b) },
        { route: routes[r3].code, kind: routes[r3].kind, from: b, to: d, towards: '', stops: seg(r3, b, d) },
      ]
      out.two.push({ legs, cost, timeMin: estimateTime(legs), fare: estimateFare(legs), kind: legKind(legs) })
    }
  }
  return out
}

export function rankPlans(plans: Plan[], mode: 'time'|'budget', crowdBoost?: number) {
  // crowdBoost: if start area High crowd, boost metro
  return [...plans].sort((a, b) => {
    let ca = mode === 'time' ? a.timeMin : a.fare
    let cb = mode === 'time' ? b.timeMin : b.fare
    if (mode === 'time' && crowdBoost && crowdBoost >= 68) {
      // prioritize metro when crowd high
      if (a.kind === 'mixed' || a.kind === 'metro') ca -= 6
      if (b.kind === 'mixed' || b.kind === 'metro') cb -= 6
    }
    // tie-breaker: fewer transfers then fewer hops
    if (ca !== cb) return ca - cb
    if (a.legs.length !== b.legs.length) return a.legs.length - b.legs.length
    return a.cost - b.cost
  })
}

export function allPlanList(findResult: any): Plan[] { return [...findResult.direct, ...findResult.one, ...findResult.two] as Plan[] }
export function availableStops(): string[] { return [...stopsList] }
export { fareBus, fareMetro }
