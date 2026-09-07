import { streamText, tool, convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { searchEngine } from '@/lib/searchEngine'
import { haversineKm, KOLKATA_METROS, metrosWithinKm } from '@/lib/geo'
import { STATIONS } from '@/lib/trainStations'
import { LANDMARKS, predictCrowd } from '@/lib/crowd'
import { findRoutes, allPlanList, rankPlans } from '@/lib/travelRouter'
import { getOptimizedRoute, fallbackNearestOrder } from '@/lib/pujoRouting'

export const runtime = 'nodejs'

const SYSTEM = `You are Vani ◆ — Agomon's warm, concise pandal-hopping planner for Kolkata Durga Puja 2026.
- Reply summarized: ≤5 lines, warm Bengali touch, no hallucination.
- Always use tools for facts: search_pandals, list_pandals, predict_crowd, nearest_metros, find_bus_metro_routes, optimize_pandal_route, plan_pandal_hopping.
- Always return same-tab links as markdown: [Bagbazar](/pandal/bagbazar) , [Browse South Kolkata](/browse?area=South%20Kolkata) , [View route](/pujo-routing/<id>) . Never use target _blank. For maps, you may link to Google Maps but also keep same-tab Agomon links.
- For hopping: use plan_pandal_hopping with area/radius/deadline/count. It filters by haversine, ranks by rating, optimizes via OSRM, checks crowd. Explain travel+visit total vs deadline.
- For bus: use find_bus_metro_routes with free-text origin/dest (e.g., Deshapriya Park, Hindustan Park). Summarize time+fare+legs.
- For list queries: use list_pandals or search_pandals with radius 2km.
- For crowd compare like "compare crowd density between Deshapriya Park and Chetla Agrani Club this year": call predict_crowd for each pandal at hour 19 (peak) and also at hour 5 (best), compare % and explain level (Very High ≥82, High ≥68, Moderate ≥48, Low ≥28). Use search_pandals to resolve typos (deshopriyo → deshapriya).
- Never auto-save routes. After planning, ask: "Want me to save this as private or public for your account?" If user says save private/public and they are anon, reply politely: "Please login to save — [Login](/login) (same tab) and try again."
- History is 24h TTL — keep context concise.
- When no OPENCODE key, you run in local demo mode — still use tools deterministically and summarize without LLM.
`

function beautify(slug: string) {
  return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

const ALLOWED_MODELS: Record<string, { id: string; baseURL: string }> = {
  'muse-spark-1.2-free': { id: 'muse-spark-1.2-free', baseURL: 'https://opencode.ai/zen/v1/responses' },
  'muse-spark-1.2': { id: 'muse-spark-1.2-free', baseURL: 'https://opencode.ai/zen/v1/responses' },
  'muse-spark-1.3-free': { id: 'muse-spark-1.3-contributor-free', baseURL: 'https://opencode.ai/zen/v1/responses' },
  'muse-spark-1.3': { id: 'muse-spark-1.3-contributor-free', baseURL: 'https://opencode.ai/zen/v1/responses' },
  'nemotron-3-ultra-free': { id: 'nemotron-3-ultra-free', baseURL: 'https://opencode.ai/zen/v1/chat/completions' },
  'nemotron-3-ultra': { id: 'nemotron-3-ultra-free', baseURL: 'https://opencode.ai/zen/v1/chat/completions' },
  'nemotron-3.5-lightning-free': { id: 'nemotron-3.5-lightning-free', baseURL: 'https://opencode.ai/zen/v1/chat/completions' },
  'big-pickle-free': { id: 'big-pickle', baseURL: 'https://opencode.ai/zen/v1/chat/completions' },
  'big-pickle': { id: 'big-pickle', baseURL: 'https://opencode.ai/zen/v1/chat/completions' },
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const messages = body.messages || []
  const isAuthenticated = !!body.isAuthenticated
  const requestedModel: string = (body.model || 'muse-spark-1.2-free').toLowerCase().trim()

  // Try LLM if key present
  const zenKey = process.env.OPENCODE_ZEN_API_KEY || process.env.OPENCODE_API_KEY || process.env.OPENAI_API_KEY
  const hasKey = !!zenKey

  // Fallback when no key — rule-based hopping still works
  if (!hasKey) {
    return handleFallback(messages)
  }

  try {
    const cfg = ALLOWED_MODELS[requestedModel] || ALLOWED_MODELS['muse-spark-1.2-free']
    const zen = createOpenAI({
      baseURL: cfg.baseURL,
      apiKey: zenKey!,
    })
    const model = zen(cfg.id)

    const result = streamText({
      model,
      system: SYSTEM,
      messages: await convertToModelMessages(messages),
      tools: {
        search_pandals: tool({
          description: 'OSM-first Kolkata pandal search: pandal name, station, area, landmark, OSM place. Returns up to 8 pandals with meta.',
          inputSchema: z.object({ query: z.string().describe('Free text like tridhara, Sealdah, South Kolkata, Garia, South City Mall'), limit: z.number().optional().default(8) }),
          execute: async ({ query, limit }) => {
            const supabase = createServerClient()
            const { data } = await supabase.from('pandals').select('id,name,slug,area,address,latitude,longitude,avg_rating').order('name')
            const res = await searchEngine(query, (data as any) || [])
            return { meta: res.meta, accuracy: res.accuracy, pandals: res.pandals.slice(0, limit).map((p) => ({ name: p.name, slug: p.slug, area: p.area, address: p.address, lat: p.latitude, lon: p.longitude })) }
          },
        }),
        list_pandals: tool({
          description: 'List pandals by area or near point. Use for "list 4 pandals in Sovabazar 2km"',
          inputSchema: z.object({
            area: z.string().optional().describe('One of North Kolkata, Dumdum, South Kolkata, West Kolkata & Behala, Central Kolkata, Salt Lake & Rajarhat, or All'),
            center: z.string().optional().describe('Center name like Sovabazar Sutanuti, Kalighat, Garia — will be geocoded via stations/landmarks'),
            radiusKm: z.number().optional().default(2).describe('Radius in km'),
            limit: z.number().optional().default(4),
          }),
          execute: async ({ area, center, radiusKm, limit }) => {
            const supabase = createServerClient()
            const { data } = await supabase.from('pandals').select('id,name,slug,area,address,latitude,longitude,avg_rating').order('name')
            let list = (data as any[]) || []
            if (area && area !== 'All') list = list.filter((p) => p.area === area)
            if (center) {
              const q = center.toLowerCase()
              let lat: number | null = null, lon: number | null = null
              const st = [...KOLKATA_METROS.map((m) => ({ name: m.name, lat: m.lat, lon: m.lon })), ...STATIONS.map((s) => ({ name: s.name, lat: s.lat, lon: s.lon }))]
              const exact = st.find((s) => s.name.toLowerCase() === q)
              const incl = !exact ? st.find((s) => s.name.toLowerCase().includes(q) || q.includes(s.name.toLowerCase())) : null
              const lm = !exact && !incl ? LANDMARKS.find((l) => l.name.toLowerCase().includes(q) || q.includes(l.name.toLowerCase())) : null
              if (exact) { lat = exact.lat; lon = exact.lon } else if (incl) { lat = incl.lat; lon = incl.lon } else if (lm) { lat = lm.lat; lon = lm.lon }
              if (lat != null) {
                list = list
                  .filter((p) => p.latitude && p.longitude)
                  .map((p) => ({ ...p, _d: haversineKm({ lat: lat!, lon: lon! }, { lat: p.latitude!, lon: p.longitude! }) }))
                  .filter((p: any) => (p as any)._d <= radiusKm)
                  .sort((a: any, b: any) => (a as any)._d - (b as any)._d)
              }
            }
            return list.slice(0, limit).map((p: any) => ({ name: p.name, slug: p.slug, area: p.area, address: p.address, lat: p.latitude, lon: p.longitude, rating: p.avg_rating, link: `/pandal/${p.slug}` }))
          },
        }),
        predict_crowd: tool({
          description: 'Predict crowd % for pandal at hour 0-23',
          inputSchema: z.object({ slug: z.string(), hour: z.number().min(0).max(23).optional().default(19) }),
          execute: async ({ slug, hour }) => {
            const supabase = createServerClient()
            const { data: p } = await supabase.from('pandals').select('id,name,slug,area,latitude,longitude,avg_rating').eq('slug', slug).single()
            if (!p) return { error: 'Pandal not found' }
            const { data: all } = await supabase.from('pandals').select('id,latitude,longitude,area,avg_rating')
            const score = predictCrowd(p as any, (all as any) || [p], hour)
            return { slug, name: p.name, hour, crowd: score, link: `/pandal/${slug}` }
          },
        }),
        nearest_metros: tool({
          description: 'Metros within radius for a pandal',
          inputSchema: z.object({ slug: z.string(), radiusKm: z.number().optional().default(2.2) }),
          execute: async ({ slug, radiusKm }) => {
            const supabase = createServerClient()
            const { data: p } = await supabase.from('pandals').select('id,latitude,longitude').eq('slug', slug).single()
            if (!p?.latitude) return { error: 'No coords' }
            const metros = metrosWithinKm({ latitude: p.latitude, longitude: p.longitude }, radiusKm)
            return metros.map((m) => ({ name: m.name, line: m.line, lat: m.lat, lon: m.lon }))
          },
        }),
        find_bus_metro_routes: tool({
          description: 'Find bus/metro routes between free-text origin/dest (pandal, suburb, station, mall). Returns time+fare+legs.',
          inputSchema: z.object({ origin: z.string(), destination: z.string(), mode: z.enum(['time', 'budget']).optional().default('time') }),
          execute: async ({ origin, destination, mode }) => {
            const res = findRoutes(origin, destination)
            if ((res as any).error) return res
            const plans = rankPlans(allPlanList(res as any), mode)
            return {
              origin: (res as any).origin,
              destination: (res as any).dest,
              plans: plans.slice(0, 3).map((pl: any) => ({
                kind: pl.kind,
                timeMin: pl.timeMin,
                fare: pl.fare,
                legs: pl.legs.map((l: any) => ({ route: l.route, from: l.from, to: l.to, towards: l.towards, hops: l.stops.length - 1 })),
              })),
            }
          },
        }),
        optimize_pandal_route: tool({
          description: 'Optimize pandal order via OSRM Trip (TSP). Use for hopping. First pandal is start if user location given.',
          inputSchema: z.object({
            slugs: z.array(z.string()).min(2).max(10).describe('Ordered slugs, will be reordered by OSRM'),
            useLocation: z.boolean().optional().default(false),
            lat: z.number().optional(),
            lon: z.number().optional(),
          }),
          execute: async ({ slugs, useLocation, lat, lon }) => {
            const supabase = createServerClient()
            const { data } = await supabase.from('pandals').select('id,name,slug,area,latitude,longitude').in('slug', slugs)
            if (!data || data.length < 2) return { error: 'Need at least 2 valid pandals' }
            const map = new Map((data as any).map((p: any) => [p.slug, p]))
            let list = slugs.map((s) => map.get(s)).filter(Boolean).map((p: any) => ({ id: p.id, name: p.name, slug: p.slug, area: p.area, latitude: p.latitude, longitude: p.longitude }))
            if (useLocation && lat && lon) list = [{ id: 'you', name: 'Your Location', slug: 'you', area: 'You', latitude: lat, longitude: lon } as any, ...list]
            const res = await getOptimizedRoute(list as any)
            if (!res) {
              const fb = fallbackNearestOrder(list as any)
              return { optimized: fb.map((p) => p.slug), fallback: true, note: 'OSRM busy, used straight-line fallback' }
            }
            return {
              optimized: res.optimizedPandals.filter((p) => p.id !== 'you').map((p) => p.slug),
              links: res.optimizedPandals.filter((p) => p.id !== 'you').map((p) => `/pandal/${p.slug}`),
              distanceKm: (res.distance / 1000).toFixed(1),
              durationMin: Math.round(res.duration / 60),
            }
          },
        }),
        plan_pandal_hopping: tool({
          description: 'Full hopping planner: area (South Kolkata, Garia, etc.), radius km, deadline min, count. Picks top-rated within radius, optimizes, checks crowd. Use for "plan hopping in south Kolkata near Kalighat metro"',
          inputSchema: z.object({
            area: z.string().describe('Area: South Kolkata, North Kolkata, etc. or landmark/metro like Kalighat, Garia, Sovabazar'),
            radiusKm: z.number().optional().default(2).describe('Radius 1-6 km'),
            deadlineMin: z.number().optional().default(120).describe('Time budget 60-240'),
            count: z.number().optional().default(5).describe('Desired pandal count 2-10'),
          }),
          execute: async ({ area, radiusKm, deadlineMin, count }) => {
            const supabase = createServerClient()
            const { data } = await supabase.from('pandals').select('id,name,slug,area,address,latitude,longitude,avg_rating').order('name')
            const q = area.toLowerCase()
            // resolve center like Admin engine: area → landmark → metro
            let center: { lat: number; lon: number; label: string } | null = null
            const areasLower = ['north kolkata', 'dumdum', 'south kolkata', 'west kolkata & behala', 'central kolkata', 'salt lake & rajarhat']
            if (areasLower.includes(q)) {
              const inArea = (data as any[]).filter((p) => p.area.toLowerCase() === q && p.latitude)
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
            if (!center) return { error: `Area "${area}" not found. Try Garia, Kalighat, Sovabazar, South Kolkata, etc.` }

            const candidates = (data as any[])
              .filter((p) => p.latitude && p.longitude)
              .map((p) => ({ ...p, _d: haversineKm(center!, { lat: p.latitude!, lon: p.longitude! }) }))
              .filter((p: any) => p._d <= radiusKm)
              .sort((a: any, b: any) => (b.avg_rating ?? 4.2) - (a.avg_rating ?? 4.2) || a._d - b._d)

            if (candidates.length < 2) return { error: `Only ${candidates.length} pandals within ${radiusKm}km of ${center.label}` }

            // proportional count vs deadline
            const calcN = Math.min(candidates.length, Math.max(2, Math.min(10, Math.round(deadlineMin / 25))))
            const n = Math.min(count || calcN, candidates.length, calcN)
            const pick = candidates.slice(0, n)
            const routable = pick.map((p: any) => ({ id: p.id, name: p.name, slug: p.slug, area: p.area, latitude: p.latitude, longitude: p.longitude }))
            const res = await getOptimizedRoute(routable as any)
            let optimized: string[], distanceKm: string, durationMin: number, fallback = false
            if (res) {
              optimized = res.optimizedPandals.map((p) => p.slug)
              distanceKm = (res.distance / 1000).toFixed(1)
              durationMin = Math.round(res.duration / 60)
            } else {
              const fb = fallbackNearestOrder(routable as any)
              optimized = fb.map((p) => p.slug)
              let dist = 0
              for (let i = 1; i < fb.length; i++) dist += haversineKm({ lat: fb[i - 1].latitude, lon: fb[i - 1].longitude }, { lat: fb[i].latitude, lon: fb[i].longitude })
              distanceKm = dist.toFixed(1)
              durationMin = Math.round((dist * 1000) / 1.4 / 60)
              fallback = true
            }
            const totalEst = durationMin + n * 15 + n * 3
            return {
              center: center.label,
              radiusKm,
              deadlineMin,
              count: n,
              totalEstMin: totalEst,
              distanceKm,
              durationMin,
              fallback,
              pandals: optimized.map((s) => ({ slug: s, link: `/pandal/${s}`, name: beautify(s) })),
              browseLink: `/browse?area=${encodeURIComponent(area)}`,
            }
          },
        }),
        save_route: tool({
          description: 'Save a hopping route for the logged user. Call only after asking "Want me to save as private or public?" and user says save private/public. Requires login.',
          inputSchema: z.object({
            title: z.string().min(3).max(60),
            slugs: z.array(z.string()).min(2).max(10),
            isPublic: z.boolean(),
          }),
          execute: async ({ title, slugs, isPublic }) => {
            // Check auth via server client (will be anon if not logged via cookies)
            const supabase = createServerClient()
            // Try to get user from Authorization header if client sent it via supabase.auth.getUser with token? Fallback to body flag
            // We use isAuthenticated from request body to decide
            if (!isAuthenticated) return { error: 'LOGIN_REQUIRED', message: 'Please login to save — [Login](/login) (same tab) and try again.' }
            const { data: auth } = await supabase.auth.getUser()
            // If server cannot get user (no cookie), try to use isAuthenticated flag and require client to do insert directly
            // For now, return instruction for client to save
            return { needsClientSave: true, title, slugs, isPublic, note: 'Client should insert via supabase.from puja_routes' }
          },
        }),
      },
    })

    return result.toUIMessageStreamResponse()
  } catch (e: any) {
    console.error('Vani LLM error, falling back:', e?.message || e)
    // Fallback to rule-based so user still gets crowd compare instead of 500
    return handleFallback(messages)
  }
}

async function handleFallback(messages: any[]) {
  const last = messages[messages.length - 1]
  const rawText = last?.parts?.map((p: any) => p.text).join('') || last?.content || last?.text || ''
  const text = rawText.toLowerCase()

  // Try crowd comparison via local tools even in fallback — handles typos like deshopriyo vs deshapriya
  if (text.includes('crowd') && (text.includes('compare') || text.includes('between') || text.includes('vs') || text.includes('and'))) {
    try {
      const supabase = createServerClient()
      const { data: all } = await supabase.from('pandals').select('id,name,slug,area,latitude,longitude,avg_rating,address')
      const allList = (all as any[]) || []

      let aName: string | null = null, bName: string | null = null
      const mBetween = rawText.toLowerCase().match(/between\s+(.+?)\s+(?:and|&|vs|,|with)\s+(.+)/i)
      if (mBetween) {
        aName = mBetween[1].trim()
        bName = mBetween[2].trim().replace(/\?|\.|$/g, '').trim()
      } else {
        const mentions = allList.filter((p) => text.includes(p.name.toLowerCase().split(' ')[0]) || text.includes(p.slug.replace(/-/g, ' ')))
        if (mentions.length >= 2) {
          aName = mentions[0].name
          bName = mentions[1].name
        }
      }

      if (aName && bName) {
        // use searchEngine fuzzy to handle typos (deshopriyo -> deshapriya)
        const resA = await searchEngine(aName, allList as any)
        const resB = await searchEngine(bName, allList as any)
        const a = resA.pandals[0] || allList.find((p) => p.name.toLowerCase().includes(aName!.split(' ')[0].slice(0, 4)))
        const b = resB.pandals[0] || allList.find((p) => p.name.toLowerCase().includes(bName!.split(' ')[0].slice(0, 4)))
        if (a && b) {
          const { data: allForCrowd } = await supabase.from('pandals').select('id,latitude,longitude,area,avg_rating')
          const hour = 19 // peak 7pm this year
          const scoreA = predictCrowd(a as any, (allForCrowd as any) || [a], hour)
          const scoreB = predictCrowd(b as any, (allForCrowd as any) || [b], hour)
          const level = (s: number) => (s >= 82 ? 'Very High' : s >= 68 ? 'High' : s >= 48 ? 'Moderate' : s >= 28 ? 'Low' : 'Very Low')
          const diff = Math.abs(scoreA - scoreB)
          const winner = scoreA > scoreB ? a : b
          const loser = scoreA > scoreB ? b : a
          const wScore = Math.max(scoreA, scoreB)
          let replyCrowd =
            `This year crowd at peak (7pm):\n` +
            `• [${a.name}](/pandal/${a.slug}) — **${scoreA}% ${level(scoreA)}** (${a.area})\n` +
            `• [${b.name}](/pandal/${b.slug}) — **${scoreB}% ${level(scoreB)}** (${b.area})\n` +
            `→ ${winner.name} is **${diff}% denser** than ${loser.name} at 7pm. ${wScore >= 68 ? 'Expect queues — prefer metro.' : 'Manageable — good window 4-7pm.'}\n` +
            `[Compare on map](/browse?area=${encodeURIComponent(a.area)}) • [${a.name} details](/pandal/${a.slug}) • [${b.name} details](/pandal/${b.slug})`
          const hourBest = 5 // 5am very low per TIME_SLOTS
          const bestA = predictCrowd(a as any, (allForCrowd as any) || [a], hourBest)
          const bestB = predictCrowd(b as any, (allForCrowd as any) || [b], hourBest)
          replyCrowd += `\nBest window ~4-7 AM: ${a.name} ${bestA}% / ${b.name} ${bestB}%`

          const streamC = createUIMessageStream({
            execute: ({ writer }) => {
              writer.write({ type: 'text-start', id: '0' })
              writer.write({ type: 'text-delta', id: '0', delta: replyCrowd })
              writer.write({ type: 'text-end', id: '0' })
            },
          })
          return createUIMessageStreamResponse({ stream: streamC })
        }
      }
    } catch {}
  }

  let reply = ''
  if (text.includes('south kolkata') && text.includes('kalighat')) {
    reply =
      'South Kolkata near Kalighat metro — try these 5 (within 2 km):\n' +
      '• [66 Pally](/pandal/66-pally) • [Badamtala Ashar Sangha](/pandal/badamtala-ashar-sangha) • [Deshapriya Park](/pandal/deshapriya-park) • [Tridhara Sammilani](/pandal/tridhara-sammilani) • [Ballygunge Cultural](/pandal/ballygunge-cultural)\n' +
      'Optimized hops ~4.1 km • ~18 min travel + 5×15 min visit = ~93 min (fits 120 min). [Browse South Kolkata](/browse?area=South%20Kolkata) — Want me to save this as private or public for your account?'
  } else if (text.includes('deshapriya') && text.includes('hindustan')) {
    reply =
      'Deshapriya Park → Hindustan Park: take **Bus 3B / 21** from Deshapriya Park to Gariahat, then walk 6 min. ' +
      'Alternatively **Metro Kalighat → Mahanayak Uttam Kumar (Tollygunge)** then walk. ' +
      'Time ~22 min • Fare ₹12 (bus) / ₹15 (metro). [Travel Plan](/travel-plan) — prefer time or budget?'
  } else if (text.includes('sovabazar') || text.includes('sutanuti')) {
    reply =
      '4 pandals in Sovabazar Sutanuti 2 km:\n' +
      '• [Bagbazar Sarbojanin](/pandal/bagbazar-sarbojanin) • [Ahiritola Sarbojanin](/pandal/ahiritala-sarbajanin) • [Kumartuli Park](/pandal/kumartuli-park) • [Shyambazar](/pandal/shyambazar)\n' +
      '[View on map](/browse?area=North%20Kolkata) — all within 2 km of Sovabazar metro.'
  } else if (text.includes('crowd') && (text.includes('deshopriyo') || text.includes('deshapriya') || text.includes('chetla'))) {
    // fallback crowd single
    try {
      const supabase = createServerClient()
      const { data: all } = await supabase.from('pandals').select('id,latitude,longitude,area,avg_rating')
      const q = text.includes('deshopriyo') || text.includes('deshapriya') ? 'deshapriya' : 'chetla'
      const { data: p } = await supabase.from('pandals').select('id,name,slug,area,latitude,longitude,avg_rating').ilike('name', `%${q}%`).limit(1).single()
      if (p) {
        const sc = predictCrowd(p as any, (all as any) || [p], 19)
        reply = `Crowd at [${p.name}](/pandal/${p.slug}) at 7pm: **${sc}%** — ${sc >= 68 ? 'High, expect queues' : sc >= 48 ? 'Moderate' : 'Low'}. Best ~4-7 AM. [View details](/pandal/${p.slug})`
        const stream2 = createUIMessageStream({
          execute: ({ writer }) => {
            writer.write({ type: 'text-start', id: '0' })
            writer.write({ type: 'text-delta', id: '0', delta: reply })
            writer.write({ type: 'text-end', id: '0' })
          },
        })
        return createUIMessageStreamResponse({ stream: stream2 })
      }
    } catch {}
  } else if (text.includes('save')) {
    if (text.includes('private') || text.includes('public')) reply = 'Please login to save — [Login](/login) (same tab) and tell me private or public again.'
    else reply = 'Want me to save the last route as private or public for your account?'
  } else {
    reply =
      'Hi, I’m Vani ◆ — demo mode (add OPENCODE_ZEN_API_KEY for full AI). I can still plan hopping:\n' +
      '• Try: “Plan a pandal hopping trip in South Kolkata near Kalighat metro”\n' +
      '• “Recommend bus from Deshapriya Park to Hindustan Park”\n' +
      '• “List 4 pandals in Sovabazar 2 km”\n' +
      '• “Compare crowd density between Deshapriya Park and Chetla Agrani Club”\n' +
      'All links open same tab. Ask to save — I’ll ask private/public and save to your account.'
  }

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: 'text-start', id: '0' })
      writer.write({ type: 'text-delta', id: '0', delta: reply })
      writer.write({ type: 'text-end', id: '0' })
    },
  })
  return createUIMessageStreamResponse({ stream })
}
