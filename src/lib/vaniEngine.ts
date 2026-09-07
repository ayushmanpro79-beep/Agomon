// src/lib/vaniEngine.ts — purely mechanical, no AI, all rule-based
// Covers all possible phrasings via keyword + searchEngine fuzzy + haversine + crowd/bus/routing tools
import { supabase } from './supabase/client'
import { searchEngine, AREAS } from './searchEngine'
import { haversineKm, KOLKATA_METROS, metrosWithinKm } from './geo'
import { STATIONS } from './trainStations'
import { LANDMARKS, predictCrowd } from './crowd'
import { findRoutes, allPlanList, rankPlans } from './travelRouter'
import { getOptimizedRoute, fallbackNearestOrder } from './pujoRouting'

type PandalRow = { id: string; name: string; slug: string; area: string; address: string | null; latitude: number | null; longitude: number | null; avg_rating?: number | null }

function beautify(slug: string) {
  return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}
function level(score: number) {
  return score >= 82 ? 'Very High' : score >= 68 ? 'High' : score >= 48 ? 'Moderate' : score >= 28 ? 'Low' : 'Very Low'
}
function normalize(s: string) {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}
function clip(s: string) {
  return s.split('\n').slice(0, 5).join('\n').slice(0, 520)
}

// Resolve center like Admin engine: area → landmark → metro/station → pandal address
async function resolveCenter(qRaw: string, all: PandalRow[]): Promise<{ lat: number; lon: number; label: string; kind: string } | null> {
  const q = normalize(qRaw)
  if (!q) return null
  // 1) Area alias exact via AREAS
  const areasLower = AREAS.map((a) => a.toLowerCase())
  if (areasLower.includes(q)) {
    const inArea = all.filter((p) => p.area.toLowerCase() === q && p.latitude && p.longitude) as any[]
    if (inArea.length) {
      const lat = inArea.reduce((s: number, p: any) => s + p.latitude, 0) / inArea.length
      const lon = inArea.reduce((s: number, p: any) => s + p.longitude, 0) / inArea.length
      return { lat, lon, label: AREAS.find((a) => a.toLowerCase() === q)!, kind: 'area' }
    }
  }
  // try alias via searchEngine meta? quick check for behala etc.
  const aliasMap: Record<string, string> = { behala: 'west kolkata & behala', 'south kolkata': 'south kolkata', 'north kolkata': 'north kolkata', 'central kolkata': 'central kolkata', 'salt lake': 'salt lake & rajarhat' }
  for (const [alias, canonical] of Object.entries(aliasMap)) {
    if (q.includes(alias)) {
      const inArea = all.filter((p) => p.area.toLowerCase() === canonical && p.latitude) as any[]
      if (inArea.length) {
        const lat = inArea.reduce((s: number, p: any) => s + p.latitude, 0) / inArea.length
        const lon = inArea.reduce((s: number, p: any) => s + p.longitude, 0) / inArea.length
        return { lat, lon, label: alias, kind: 'area' }
      }
    }
  }
  // 2) Landmark
  const lm = LANDMARKS.find((l) => l.name.toLowerCase().includes(q) || q.includes(l.name.toLowerCase()))
  if (lm) return { lat: lm.lat, lon: lm.lon, label: lm.name, kind: 'landmark' }
  // 3) Metro / Station
  const st = [...KOLKATA_METROS.map((m) => ({ name: m.name, lat: m.lat, lon: m.lon })), ...STATIONS.map((s) => ({ name: s.name, lat: s.lat, lon: s.lon }))]
  const exact = st.find((s) => s.name.toLowerCase() === q)
  if (exact) return { lat: exact.lat, lon: exact.lon, label: exact.name, kind: 'metro' }
  const includes = st.find((s) => s.name.toLowerCase().includes(q) || q.includes(s.name.toLowerCase()))
  if (includes) return { lat: includes.lat, lon: includes.lon, label: includes.name, kind: 'metro' }
  // 4) Pandal address fallback
  const nearby = all.filter((p) => p.address?.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
  if (nearby.length) {
    const withCoords = nearby.filter((p) => p.latitude && p.longitude) as any[]
    if (withCoords.length) {
      const lat = withCoords.reduce((s, p) => s + p.latitude!, 0) / withCoords.length
      const lon = withCoords.reduce((s, p) => s + p.longitude!, 0) / withCoords.length
      return { lat, lon, label: qRaw, kind: 'area' }
    }
  }
  return null
}

export async function getVaniReply(raw: string): Promise<string> {
  const text = normalize(raw)
  const lower = text.toLowerCase()

  // 0) Greeting / help
  if (/^(hi|hello|hey|hii|good morning|good evening|namaste|joy ma durga)[\s!]*$/i.test(text)) {
    return clip(`Shubho Pujo! ◆ Hi, I'm Vani — your hopping planner.\nTry: [Plan hopping near Kalighat](/browse?area=South%20Kolkata) • [How crowded is Sreebhumi?](/pandal/sreebhumi-sporting-club)\n[Browse all](/browse) — ask anything about pandals, crowd, buses, routes.`)
  }
  if (lower.includes('help') || lower.includes('what can you do') || lower.includes('how to use')) {
    return clip(`Vani can:\n• List pandals near any place/area/metro [Garia 2km](/browse?area=South%20Kolkata)\n• Check crowd at any hour & compare [Deshapriya vs Chetla](/pandal/deshapriyo-park)\n• Recommend bus/metro [Deshapriya → Hindustan](/travel-plan)\n• Plan hopping trip with time/radius [South Kolkata near Kalighat](/pujo-routing/create)\nAll links open same tab.`)
  }

  const supabaseClient = supabase

  // 1) Crowd compare — must come before single crowd
  if (lower.includes('crowd') && (lower.includes('compare') || lower.includes('between') || lower.includes(' vs ') || lower.includes(' vs.'))) {
    try {
      const { data: all } = await supabaseClient.from('pandals').select('id,name,slug,area,latitude,longitude,avg_rating,address')
      const allList = (all as any[]) || []
      let aName: string | null = null, bName: string | null = null
      const mBetween = raw.toLowerCase().match(/between\s+(.+?)\s+(?:and|&|vs\.?|,|with)\s+(.+)/i)
      if (mBetween) {
        aName = mBetween[1].trim()
        bName = mBetween[2].trim().replace(/\?|\.|$/g, '').trim()
      } else {
        // fallback: find two pandals mentioned
        const mentions = allList.filter((p) => lower.includes(p.name.toLowerCase().split(' ')[0]))
        if (mentions.length >= 2) {
          aName = mentions[0].name
          bName = mentions[1].name
        }
      }
      if (aName && bName) {
        const resA = await searchEngine(aName, allList as any)
        const resB = await searchEngine(bName, allList as any)
        const a = resA.pandals[0] || allList.find((p) => p.name.toLowerCase().includes(aName!.split(' ')[0].slice(0, 4).toLowerCase()))
        const b = resB.pandals[0] || allList.find((p) => p.name.toLowerCase().includes(bName!.split(' ')[0].slice(0, 4).toLowerCase()))
        if (a && b) {
          const { data: allForCrowd } = await supabaseClient.from('pandals').select('id,latitude,longitude,area,avg_rating')
          const hour = 19
          const scoreA = predictCrowd(a as any, (allForCrowd as any) || [a], hour)
          const scoreB = predictCrowd(b as any, (allForCrowd as any) || [b], hour)
          const diff = Math.abs(scoreA - scoreB)
          const winner = scoreA > scoreB ? a : b
          const bestA = predictCrowd(a as any, (allForCrowd as any) || [a], 5)
          const bestB = predictCrowd(b as any, (allForCrowd as any) || [b], 5)
          return clip(
            `This year crowd at peak (7pm):\n` +
              `• [${a.name}](/pandal/${a.slug}) — **${scoreA}% ${level(scoreA)}**\n` +
              `• [${b.name}](/pandal/${b.slug}) — **${scoreB}% ${level(scoreB)}**\n` +
              `→ ${winner.name} is **${diff}% denser** at 7pm. Best ~5am: ${a.name} ${bestA}% / ${b.name} ${bestB}%\n` +
              `[Compare on map](/browse?area=${encodeURIComponent(a.area)}) • [${a.name}](/pandal/${a.slug}) • [${b.name}](/pandal/${b.slug})`,
          )
        }
      }
    } catch {}
  }

  // 2) Single crowd: how crowded is X, crowd at X, least crowded near Garia, best time for X
  if (lower.includes('crowd') || lower.includes('crowded') || lower.includes('least crowded') || lower.includes('best time') || lower.includes('rush')) {
    try {
      const { data: all } = await supabaseClient.from('pandals').select('id,name,slug,area,latitude,longitude,avg_rating,address')
      const allList = (all as any[]) || []
      // least crowded near Garia
      if (lower.includes('least crowded') || lower.includes('least crowd')) {
        const centerName = lower.includes('garia') ? 'garia' : lower.match(/near\s+([a-z\s]+)/)?.[1]?.trim() || ''
        let center: any = null
        if (centerName) {
          const st = [...KOLKATA_METROS, ...STATIONS].map((m) => ({ name: m.name, lat: (m as any).lat, lon: (m as any).lon }))
          center = st.find((s) => s.name.toLowerCase().includes(centerName) || centerName.includes(s.name.toLowerCase())) || LANDMARKS.find((l) => l.name.toLowerCase().includes(centerName))
          if (center) {
            const lat = (center as any).lat, lon = (center as any).lon
            const candidates = allList
              .filter((p) => p.latitude && p.longitude)
              .map((p) => ({ ...p, _d: haversineKm({ lat, lon }, { lat: p.latitude!, lon: p.longitude! }) }))
              .filter((p: any) => p._d <= 3)
              .slice(0, 12)
            const { data: allForCrowd } = await supabaseClient.from('pandals').select('id,latitude,longitude,area,avg_rating')
            const scored = candidates.map((p: any) => ({ p, sc: predictCrowd(p, (allForCrowd as any) || [p], 19) })).sort((a: any, b: any) => a.sc - b.sc).slice(0, 4)
            return clip(`Least crowded near ${center.name} at 7pm (3km):\n` + scored.map((x: any) => `• [${x.p.name}](/pandal/${x.p.slug}) — ${x.sc}% ${level(x.sc)}`).join('\n') + `\n[Browse](/browse?area=${encodeURIComponent(scored[0]?.p.area || 'South Kolkata')})`)
          }
        }
      }
      // how crowded is X at Ypm
      let q = raw.match(/crowded is\s+([^?]+?)(?:\s+at|\s+near|\?|$)/i)?.[1] || raw.match(/how crowded is\s+([^?]+)/i)?.[1] || raw.match(/crowd\s+(?:at|for)\s+([^?]+)/i)?.[1] || ''
      q = q.trim().replace(/at\s+\d+.*$/i, '').trim()
      if (!q) {
        // try to find any pandal mention
        const hit = allList.find((p) => lower.includes(p.name.toLowerCase()) || lower.includes(p.slug.replace(/-/g, ' ')))
        if (hit) q = hit.name
      }
      if (q) {
        const res = await searchEngine(q, allList as any)
        const p = res.pandals[0]
        if (p) {
          const hourMatch = raw.match(/(\d+)\s*pm/i)
          const hour = hourMatch ? (parseInt(hourMatch[1]) % 12) + 12 : 19
          const { data: allForCrowd } = await supabaseClient.from('pandals').select('id,latitude,longitude,area,avg_rating')
          const sc = predictCrowd(p as any, (allForCrowd as any) || [p], hour)
          const best = predictCrowd(p as any, (allForCrowd as any) || [p], 5)
          return clip(`Crowd at [${p.name}](/pandal/${p.slug}) at ${hour}:00: **${sc}% ${level(sc)}**\nBest ~5am ${best}%. [View](/pandal/${p.slug}) • [Nearby metros 2.2km](/pandal/${p.slug})`)
        }
      }
    } catch {}
  }

  // 3) Bus / metro: how to go, bus from X to Y, recommend, route, fare, time
  if (lower.includes('bus') || lower.includes('metro') || lower.includes('how to go') || lower.includes('how to reach') || lower.includes('recommend') || (lower.includes(' from ') && lower.includes(' to '))) {
    try {
      let origin: string | null = null, dest: string | null = null
      const mFromTo = raw.match(/from\s+(.+?)\s+to\s+(.+)/i)
      const mTo = raw.match(/(.+?)\s+to\s+(.+)/i)
      if (mFromTo) { origin = mFromTo[1].trim(); dest = mFromTo[2].trim() } else if (mTo && !lower.includes('compare')) { origin = mTo[1].split(/recommend|bus|metro|take|which/i).pop()?.trim() || null; dest = mTo[2].trim() }
      if (origin && dest) {
        dest = dest.replace(/\?|\.|$/g, '').trim()
        // clean origin of leading verbs
        origin = origin.replace(/^(recommend|which bus|bus|metro|how to go|how to reach|route)\s+/i, '').trim()
        const res: any = findRoutes(origin, dest)
        if (!res.error) {
          const plans = rankPlans(allPlanList(res), 'time')
          const top = plans[0]
          if (top) {
            return clip(`${origin} → ${dest}: **${top.kind}** • ${top.timeMin} min • ₹${top.fare}\n` + top.legs.map((l: any) => `• [${l.route}] ${l.from} → ${l.to} (${l.stops.length - 1} stops)`).join('\n') + `\n[Travel Plan](/travel-plan)`)
          }
        } else {
          return clip(`${res.error}\nTry [Travel Plan](/travel-plan) with Bus stop names like Esplanade, Sealdah.`)
        }
      }
    } catch {}
  }

  // 4) Admin Suggested routes
  if (lower.includes('admin') && lower.includes('route')) {
    try {
      const supabaseC = supabaseClient
      let areaFilter = ''
      if (lower.includes('behala')) areaFilter = 'behala'
      else if (lower.includes('garia')) areaFilter = 'garia'
      else if (lower.includes('jadavpur')) areaFilter = 'jadavpur'
      else if (lower.includes('kalighat')) areaFilter = 'kalighat'
      else if (lower.includes('sovabazar') || lower.includes('sutanuti')) areaFilter = 'sovabazar'
      let q = supabaseC.from('puja_routes').select('id,title,admin_area,username').eq('username', 'Admin Suggested').eq('is_public', true).order('created_at', { ascending: false }).limit(10)
      if (areaFilter) q = supabaseC.from('puja_routes').select('id,title,admin_area,username').eq('username', 'Admin Suggested').ilike('admin_area', `%${areaFilter}%`).eq('is_public', true).limit(10) as any
      const { data: routes } = await q
      if (routes && routes.length) {
        return clip(`Admin Suggested routes:\n` + routes.slice(0, 4).map((r: any) => `• [${r.title}](/pujo-routing/${r.id}) • ${r.admin_area || ''}`).join('\n') + `\n[Browse all](/pujo-routing)`)
      }
      return clip(`No Admin Suggested routes for that area yet.\nTry [Public routes](/pujo-routing) or ask to plan hopping.`)
    } catch {}
  }

  // 5) List / near / show pandals - handle all phrasings: list, show, near, around, vicinity, in, pandals in X, near X
  if (lower.includes('list') || lower.includes('show') || lower.includes('near') || lower.includes('around') || lower.includes('vicinity') || lower.includes('pandals in') || lower.includes('pandals near')) {
    try {
      const { data: all } = await supabaseClient.from('pandals').select('id,name,slug,area,address,latitude,longitude,avg_rating').order('name')
      const allList = (all as any[]) || []
      // extract center
      let centerName = raw.match(/(?:in|near|around|vicinity)\s+([^0-9]+?)(?:\s+\d+\s*km|\s*$|\?)/i)?.[1]?.trim().replace(/’s.*$/, '').trim() || ''
      if (!centerName) {
        centerName = AREAS.find((a) => lower.includes(a.toLowerCase())) || ''
        if (!centerName) {
          const areasLower = ['garia', 'jadavpur', 'kalighat', 'sovabazar', 'behala', 'salt lake', 'new town', 'park street', 'esplanade']
          centerName = areasLower.find((a) => lower.includes(a)) || ''
        }
      }
      const radiusMatch = raw.match(/(\d+(?:\.\d+)?)\s*km/i)
      const radiusKm = radiusMatch ? parseFloat(radiusMatch[1]) : 2
      const limitMatch = raw.match(/list\s+(\d+)/i) || raw.match(/(\d+)\s+pandals/i)
      const limit = limitMatch ? parseInt(limitMatch[1]) : 4
      if (centerName) {
        const res = await searchEngine(centerName, allList as any)
        if (res.pandals.length) {
          const pandals = res.pandals.slice(0, limit)
          return clip(`${res.meta}:\n` + pandals.map((p) => `• [${p.name}](/pandal/${p.slug})`).join('\n') + `\n[Browse](/browse?area=${encodeURIComponent(pandals[0]?.area || centerName)})`)
        }
        // fallback haversine near found station/landmark
        const st = [...KOLKATA_METROS.map((m) => ({ name: m.name, lat: m.lat, lon: m.lon })), ...STATIONS.map((s) => ({ name: s.name, lat: s.lat, lon: s.lon })), ...LANDMARKS.map((l) => ({ name: l.name, lat: l.lat, lon: l.lon }))]
        const found = st.find((s) => s.name.toLowerCase().includes(centerName.toLowerCase()) || centerName.toLowerCase().includes(s.name.toLowerCase()))
        if (found) {
          const list = allList.filter((p) => p.latitude && p.longitude).map((p) => ({ ...p, _d: haversineKm(found, { lat: p.latitude!, lon: p.longitude! }) })).filter((p: any) => p._d <= radiusKm).sort((a: any, b: any) => a._d - b._d).slice(0, limit)
          return clip(`Near ${found.name} (${radiusKm}km):\n` + list.map((p: any) => `• [${p.name}](/pandal/${p.slug})`).join('\n') + `\n[Browse](/browse?area=${encodeURIComponent(list[0]?.area || centerName)})`)
        }
      } else {
        // no center, list by area
        const area = AREAS.find((a) => lower.includes(a.toLowerCase()))
        if (area) {
          const list = allList.filter((p) => p.area === area).slice(0, limit)
          return clip(`Pandals in ${area}:\n` + list.map((p) => `• [${p.name}](/pandal/${p.slug})`).join('\n') + `\n[Browse ${area}](/browse?area=${encodeURIComponent(area)})`)
        }
      }
    } catch {}
  }

  // 6) Pandal details: tell me about X, what is X, details of X, show X
  if (lower.startsWith('tell me about') || lower.startsWith('what is') || lower.startsWith('details of') || lower.startsWith('show me') || lower.includes('tell me about') || lower.includes('details of')) {
    try {
      const { data: all } = await supabaseClient.from('pandals').select('id,name,slug,area,address,latitude,longitude,avg_rating,image_url').order('name')
      let q = raw.match(/about\s+([^?]+)/i)?.[1] || raw.match(/what is\s+([^?]+)/i)?.[1] || raw.match(/details of\s+([^?]+)/i)?.[1] || raw.match(/show me\s+([^?]+)/i)?.[1] || ''
      q = q.trim().replace(/pandal.*$/i, '').trim()
      if (q) {
        const res = await searchEngine(q, (all as any) || [])
        const p: any = res.pandals[0]
        if (p) {
          const metros = p.latitude ? metrosWithinKm({ latitude: p.latitude, longitude: p.longitude }, 2.2) : []
          const metroStr = metros.length ? `Nearest metro: ${metros[0].name} (${metros[0].line})` : 'Nearest metro: —'
          return clip(`[${p.name}](/pandal/${p.slug}) — ${p.area} • ${p.address || ''}\n${metroStr} • Rating ${p.avg_rating || 4.2}★\n[View details](/pandal/${p.slug}) • [Map](/browse)`)
        }
      }
    } catch {}
  }

  // 7) Hopping / plan trip — most complex, handle all phrasings
  if (lower.includes('plan') || lower.includes('hopping') || lower.includes('trip') || lower.includes('itinerary') || lower.includes('route') || lower.includes('hops')) {
    try {
      // extract area after in/near
      let area = raw.match(/(?:in|near|around)\s+([^0-9]+?)(?:\s+near|\s+\d|$)/i)?.[1]?.trim() || raw.match(/south kolkata|north kolkata|dumdum|behala|jadavpur|garia|kalighat|sovabazar|salt lake|new town|central kolkata|west kolkata/i)?.[0] || 'South Kolkata'
      const radiusM = raw.match(/(\d+(?:\.\d+)?)\s*km/i)
      const radiusKm = radiusM ? parseFloat(radiusM[1]) : 2
      const deadlineM = raw.match(/(\d+)\s*(?:min|hour|hr)/i)
      let deadlineMin = 120
      if (deadlineM) {
        const val = parseInt(deadlineM[1])
        deadlineMin = lower.includes('hour') || lower.includes('hr') ? val * 60 : val
      }
      const countM = raw.match(/(\d+)\s*pandals/i)
      const count = countM ? parseInt(countM[1]) : undefined

      const { data } = await supabaseClient.from('pandals').select('id,name,slug,area,address,latitude,longitude,avg_rating').order('name')
      const all = (data as any[]) || []
      const q = area.toLowerCase()
      let center: any = null
      const areasLower = ['north kolkata', 'dumdum', 'south kolkata', 'west kolkata & behala', 'central kolkata', 'salt lake & rajarhat']
      if (areasLower.includes(q)) {
        const inArea = all.filter((p) => p.area.toLowerCase() === q && p.latitude)
        if (inArea.length) center = { lat: inArea.reduce((s: number, p: any) => s + p.latitude, 0) / inArea.length, lon: inArea.reduce((s: number, p: any) => s + p.longitude, 0) / inArea.length, label: area }
      }
      if (!center) {
        const lm = LANDMARKS.find((l) => l.name.toLowerCase().includes(q) || q.includes(l.name.toLowerCase()))
        if (lm) center = { lat: lm.lat, lon: lm.lon, label: lm.name }
      }
      if (!center) {
        const sts = [...KOLKATA_METROS.map((m) => ({ name: m.name, lat: m.lat, lon: m.lon })), ...STATIONS.map((s) => ({ name: s.name, lat: s.lat, lon: s.lon }))]
        const ex = sts.find((s) => s.name.toLowerCase() === q)
        const inc = !ex ? sts.find((s) => s.name.toLowerCase().includes(q) || q.includes(s.name.toLowerCase())) : null
        const pick = ex || inc
        if (pick) center = { lat: pick.lat, lon: pick.lon, label: pick.name }
      }
      if (center) {
        const candidates = all.filter((p) => p.latitude && p.longitude).map((p) => ({ ...p, _d: haversineKm(center, { lat: p.latitude!, lon: p.longitude! }) })).filter((p: any) => p._d <= radiusKm).sort((a: any, b: any) => (b.avg_rating ?? 4.2) - (a.avg_rating ?? 4.2) || a._d - b._d)
        if (candidates.length >= 2) {
          const calcN = Math.min(candidates.length, Math.max(2, Math.min(10, Math.round(deadlineMin / 25))))
          const n = Math.min(count || calcN, candidates.length, calcN)
          const pick = candidates.slice(0, n)
          const routable = pick.map((p: any) => ({ id: p.id, name: p.name, slug: p.slug, area: p.area, latitude: p.latitude, longitude: p.longitude }))
          const res = await getOptimizedRoute(routable as any)
          let optimized: string[], distanceKm: string, durationMin: number
          if (res) { optimized = res.optimizedPandals.map((p) => p.slug); distanceKm = (res.distance / 1000).toFixed(1); durationMin = Math.round(res.duration / 60) } else { const fb = fallbackNearestOrder(routable as any); optimized = fb.map((p) => p.slug); let d = 0; for (let i = 1; i < fb.length; i++) d += haversineKm({ lat: fb[i - 1].latitude, lon: fb[i - 1].longitude }, { lat: fb[i].latitude, lon: fb[i].longitude }); distanceKm = d.toFixed(1); durationMin = Math.round((d * 1000) / 1.4 / 60) }
          const total = durationMin + n * 18
          return clip(
            `${center.label} (${radiusKm}km, ${deadlineMin}min):\n` +
              optimized.map((s) => `• [${beautify(s)}](/pandal/${s})`).join('\n') +
              `\n~${distanceKm}km • ${durationMin}min travel + ${n * 18}min visits = ${total}/${deadlineMin}min\n` +
              `[Browse](/browse?area=${encodeURIComponent(area)}) — Save? private/public?`,
          )
        } else {
          return clip(`Only ${candidates.length} pandals within ${radiusKm}km of ${center.label}. Try larger radius.\n[Browse](/browse)`)
        }
      }
    } catch {}
  }

  // 8) Gallery / about / general
  if (lower.includes('gallery') || lower.includes('poster') || lower.includes('picture')) {
    return clip(`Gallery — posters & pictures on welcome page:\nDepthCarousel below hero, tap front poster to expand with label+details.\n[View gallery](/#gallery) — admin posts via /admin → Gallery Manager.`)
  }
  if (lower.includes('about') || lower.includes('who are you') || lower.includes('what is agomon')) {
    return clip(`Agomon — Explore Various Pandals in Kolkata 2026.\nLive map, crowd meter, bus+metro, hopping optimizer.\n[About](/about) • [Browse](/browse)`)
  }

  // 9) Save
  if (lower.includes('save')) {
    if (lower.includes('private') || lower.includes('public')) return clip(`Please login to save — [Login](/login) (same tab) and tell me private or public again.`)
    return clip(`Want me to save the last route as private or public for your account?`)
  }

  // 10) Fallback — try searchEngine for any pandal mention, else generic
  try {
    const { data: all } = await supabaseClient.from('pandals').select('id,name,slug,area,address,latitude,longitude').order('name').limit(10)
    const res = await searchEngine(raw, (all as any) || [])
    if (res.pandals.length) {
      return clip(`${res.meta}:\n` + res.pandals.slice(0, 4).map((p) => `• [${p.name}](/pandal/${p.slug})`).join('\n') + `\n[Browse](/browse)`)
    }
  } catch {}

  return clip(
    `Hi, I'm Vani ◆ — Shubho Pujo!\n` +
      `Try: "Plan hopping South Kolkata near Kalighat 2km"\n` +
      `• "How crowded is Sreebhumi at 8pm?"\n` +
      `• "List 4 pandals near Garia 2km"\n` +
      `• "Deshapriya Park to Hindustan Park bus?"\n` +
      `All links same-tab.`,
  )
}
