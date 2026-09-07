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
STRICT: Output EXACTLY ≤5 lines (max 420 chars, 80 words). Count \\n. Use 2-4 bullets • max. Never add preamble "As an AI…". Warm Bengali touch = 1 phrase max ("Shubho Pujo!") at end.

Rules:
- Always call tools before answering. No hallucinated crowd/time/slug. If tool returns empty/error → say "Data unavailable within Xkm — try larger radius" and stop.
- Repeat tool outputs verbatim. Never invent slug. Use beautify via tool name, not slug.
- Always return 1-3 same-tab links as markdown: [Bagbazar](/pandal/bagbazar) , [Browse South Kolkata](/browse?area=South%20Kolkata) , [View route](/pujo-routing/<id>). Never target _blank. For Google Maps also keep Agomon links.
- For hopping: MUST use plan_pandal_hopping with area/radius/deadline/count (not search_pandals). Explain travel+visit total vs deadline in 1 line.
- For bus: use find_bus_metro_routes with free-text origin/dest. Summarize time+fare+legs in 1 line.
- For list: use list_pandals or search_pandals with radius 2km, max 4 results.
- For crowd compare "compare crowd density between Deshapriya Park and Chetla Agrani Club": call search_pandals to resolve typos, then predict_crowd for each at hour 19 (peak) and hour 5 (best), compare % and level (Very High ≥82, High ≥68, Moderate ≥48, Low ≥28).
- Never auto-save. After planning ask exactly: "Want me to save this as private or public for your account?" If anon says save → "Please login to save — [Login](/login) (same tab) and try again."
- History 24h TTL — keep concise. Deterministic: temperature low, repeat tool values verbatim.

Few-shot:
User: Plan hopping South Kolkata near Kalighat 2km 120min
Assistant:
South Kolkata near Kalighat (2km):
• [66 Pally](/pandal/66-pally) • [Deshapriya Park](/pandal/deshapriya-park) • [Tridhara](/pandal/tridhara-sammilani)
~4.1km • ~18min + 45min visits = 93/120min
[Browse](/browse?area=South%20Kolkata) — Save? private/public?

User: How crowded is Sreebhumi at 8pm?
Assistant:
[Sreebhumi Sporting Club](/pandal/sreebhumi-sporting-club) at 8pm: 78% High — expect queues. Best 5am 22% Low. [View](/pandal/sreebhumi-sporting-club)

DO NOT exceed 5 lines or add extra explanation.
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

    const cappedMessages = (await convertToModelMessages(messages)).slice(-10)
    const result = streamText({
      model,
      system: SYSTEM,
      messages: cappedMessages,
      temperature: 0.2,
      topP: 0.8,
      maxOutputTokens: 380,
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

  // Generic intent routing for any custom question (no hard-coded 3 patterns — uses tools)
  let reply = ''

  // Bus / metro intent
  if (text.includes('bus') || text.includes('metro') || text.includes('how to go') || text.includes('recommend') || text.includes('route from') || text.includes('→') || (text.includes(' from ') && text.includes(' to '))) {
    try {
      const supabase = createServerClient()
      // naive extract origin/dest: "from X to Y" or "X to Y"
      let origin: string | null = null, dest: string | null = null
      const mFromTo = rawText.match(/from\s+(.+?)\s+to\s+(.+)/i)
      const mTo = rawText.match(/(.+?)\s+to\s+(.+)/i)
      if (mFromTo) { origin = mFromTo[1].trim(); dest = mFromTo[2].trim() } else if (mTo && !text.includes('compare')) { origin = mTo[1].split(/recommend|bus|metro|take|which/i).pop()?.trim() || null; dest = mTo[2].trim() }
      if (origin && dest) {
        dest = dest.replace(/\?|\.|$/g, '').trim()
        const res: any = findRoutes(origin, dest)
        if (!res.error) {
          const plans = rankPlans(allPlanList(res), 'time')
          const top = plans[0]
          if (top) {
            reply = `${origin} → ${dest}: **${top.kind}** • ${top.timeMin} min • ₹${top.fare}\n` + top.legs.map((l: any) => `• [${l.route}] ${l.from} → ${l.to} (${l.stops.length - 1} stops)`).join('\n') + `\n[Travel Plan](/travel-plan) — ask time vs budget`
            reply = reply.split('\n').slice(0, 5).join('\n').slice(0, 520)
            const streamB = createUIMessageStream({ execute: ({ writer }) => { writer.write({ type: 'text-start', id: '0' }); writer.write({ type: 'text-delta', id: '0', delta: reply }); writer.write({ type: 'text-end', id: '0' }) } })
            return createUIMessageStreamResponse({ stream: streamB })
          }
        }
      }
    } catch {}
  }

  // Single crowd: "how crowded is X at 8pm" or "which pandals near Garia are least crowded"
  if (text.includes('crowd') && !text.includes('compare') && !text.includes('between')) {
    try {
      const supabase = createServerClient()
      const { data: all } = await supabase.from('pandals').select('id,name,slug,area,latitude,longitude,avg_rating,address')
      // extract pandal name: after "is" or "at" or "near"
      let q = rawText.match(/crowded is\s+([^?]+?)(?:\s+at|\s+near|\?|$)/i)?.[1] || rawText.match(/how crowded is\s+([^?]+)/i)?.[1] || ''
      q = q.trim().replace(/at\s+\d+pm.*$/i, '').trim()
      if (q) {
        const res = await searchEngine(q, (all as any) || [])
        const p = res.pandals[0]
        if (p) {
          const hourMatch = rawText.match(/(\d+)\s*pm/i)
          const hour = hourMatch ? (parseInt(hourMatch[1]) % 12) + 12 : 19
          const { data: allForCrowd } = await supabase.from('pandals').select('id,latitude,longitude,area,avg_rating')
          const sc = predictCrowd(p as any, (allForCrowd as any) || [p], hour)
          const level = sc >= 82 ? 'Very High' : sc >= 68 ? 'High' : sc >= 48 ? 'Moderate' : sc >= 28 ? 'Low' : 'Very Low'
          reply = `Crowd at [${p.name}](/pandal/${p.slug}) at ${hour}:00: **${sc}% ${level}**\nBest ~4-7 AM. [View](/pandal/${p.slug}) • [Nearby metros](/pandal/${p.slug})`
          const streamC = createUIMessageStream({ execute: ({ writer }) => { writer.write({ type: 'text-start', id: '0' }); writer.write({ type: 'text-delta', id: '0', delta: reply }); writer.write({ type: 'text-end', id: '0' }) } })
          return createUIMessageStreamResponse({ stream: streamC })
        }
      }
      // Garia least crowded: list near Garia then rank by crowd
      if (text.includes('garia') && text.includes('least crowded')) {
        const center = [...KOLKATA_METROS, ...STATIONS].find((s) => s.name.toLowerCase() === 'garia')
        if (center) {
          const candidates = (all as any[]).filter((p) => p.latitude && p.longitude).map((p) => ({ ...p, _d: haversineKm(center, { lat: p.latitude!, lon: p.longitude! }) })).filter((p: any) => p._d <= 3).slice(0, 10)
          const { data: allForCrowd } = await supabase.from('pandals').select('id,latitude,longitude,area,avg_rating')
          const scored = candidates.map((p: any) => ({ p, sc: predictCrowd(p, (allForCrowd as any) || [p], 19) })).sort((a: any, b: any) => a.sc - b.sc).slice(0, 4)
          reply = `Least crowded near Garia at 7pm (3km):\n` + scored.map((x: any) => `• [${x.p.name}](/pandal/${x.p.slug}) — ${x.sc}%`).join('\n') + `\n[Browse Garia](/browse?area=South%20Kolkata)`
          reply = reply.split('\n').slice(0, 5).join('\n')
          const streamG = createUIMessageStream({ execute: ({ writer }) => { writer.write({ type: 'text-start', id: '0' }); writer.write({ type: 'text-delta', id: '0', delta: reply }); writer.write({ type: 'text-end', id: '0' }) } })
          return createUIMessageStreamResponse({ stream: streamG })
        }
      }
    } catch {}
  }

  // List / near queries: "list 4 pandals in X 2km" or "show pandals near X"
  if (text.includes('list') || text.includes('show') || text.includes('near') || text.includes('around')) {
    try {
      const supabase = createServerClient()
      const { data: all } = await supabase.from('pandals').select('id,name,slug,area,address,latitude,longitude,avg_rating').order('name')
      // extract center: after "in" or "near" or "around"
      const mCenter = rawText.match(/(?:in|near|around|vicinity)\s+([^0-9]+?)(?:\s+\d+\s*km|\s*$|\?)/i)
      let centerName = mCenter?.[1]?.trim().replace(/’s.*$/, '').trim() || ''
      if (!centerName) {
        // fallback: try area alias
        const areasLower = ['north kolkata', 'dumdum', 'south kolkata', 'west kolkata & behala', 'central kolkata', 'salt lake & rajarhat', 'garia', 'jadavpur', 'kalighat', 'sovabazar', 'behala']
        centerName = areasLower.find((a) => text.includes(a)) || ''
      }
      const radiusMatch = rawText.match(/(\d+(?:\.\d+)?)\s*km/i)
      const radiusKm = radiusMatch ? parseFloat(radiusMatch[1]) : 2
      const limitMatch = rawText.match(/list\s+(\d+)/i)
      const limit = limitMatch ? parseInt(limitMatch[1]) : 4
      if (centerName) {
        const res = await searchEngine(centerName, (all as any) || [])
        // if searchEngine returned filtered pandals already within radius, use them
        if (res.pandals.length) {
          const pandals = res.pandals.slice(0, limit)
          reply = `${res.meta}:\n` + pandals.map((p) => `• [${p.name}](/pandal/${p.slug})`).join('\n') + `\n[Browse](/browse?area=${encodeURIComponent(pandals[0]?.area || centerName)})`
          reply = reply.split('\n').slice(0, 5).join('\n').slice(0, 520)
          const streamL = createUIMessageStream({ execute: ({ writer }) => { writer.write({ type: 'text-start', id: '0' }); writer.write({ type: 'text-delta', id: '0', delta: reply }); writer.write({ type: 'text-end', id: '0' }) } })
          return createUIMessageStreamResponse({ stream: streamL })
        }
        // fallback: direct filter near center via haversine if searchEngine gave area
        const st = [...KOLKATA_METROS.map((m) => ({ name: m.name, lat: m.lat, lon: m.lon })), ...STATIONS.map((s) => ({ name: s.name, lat: s.lat, lon: s.lon })), ...LANDMARKS.map((l) => ({ name: l.name, lat: l.lat, lon: l.lon }))]
        const found = st.find((s) => s.name.toLowerCase().includes(centerName.toLowerCase()) || centerName.toLowerCase().includes(s.name.toLowerCase()))
        if (found) {
          const list = (all as any[]).filter((p) => p.latitude && p.longitude).map((p) => ({ ...p, _d: haversineKm(found, { lat: p.latitude!, lon: p.longitude! }) })).filter((p: any) => p._d <= radiusKm).sort((a: any, b: any) => a._d - b._d).slice(0, limit)
          reply = `Near ${found.name} (${radiusKm}km):\n` + list.map((p: any) => `• [${p.name}](/pandal/${p.slug})`).join('\n')
          reply = reply.split('\n').slice(0, 5).join('\n')
          const streamL2 = createUIMessageStream({ execute: ({ writer }) => { writer.write({ type: 'text-start', id: '0' }); writer.write({ type: 'text-delta', id: '0', delta: reply }); writer.write({ type: 'text-end', id: '0' }) } })
          return createUIMessageStreamResponse({ stream: streamL2 })
        }
      }
    } catch {}
  }

  // Hopping plan generic: "plan ... hopping ... in X" or "trip ... near X"
  if (text.includes('plan') || text.includes('hopping') || text.includes('trip')) {
    try {
      // extract area after "in" 
      const mArea = rawText.match(/(?:in|near)\s+([^0-9]+?)(?:\s+near|\s+\d|$)/i)
      let area = mArea?.[1]?.trim() || rawText.match(/south kolkata|north kolkata|dumdum|behala|jadavpur|garia|kalighat|sovabazar|salt lake/i)?.[0] || 'South Kolkata'
      const radiusM = rawText.match(/(\d+(?:\.\d+)?)\s*km/i)
      const radiusKm = radiusM ? parseFloat(radiusM[1]) : 2
      const deadlineM = rawText.match(/(\d+)\s*min/i)
      const deadlineMin = deadlineM ? parseInt(deadlineM[1]) : 120
      // reuse plan_pandal_hopping logic via direct call
      const supabase = createServerClient()
      const { data } = await supabase.from('pandals').select('id,name,slug,area,address,latitude,longitude,avg_rating').order('name')
      const q = area.toLowerCase()
      let center: any = null
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
      if (center) {
        const candidates = (data as any[]).filter((p) => p.latitude && p.longitude).map((p) => ({ ...p, _d: haversineKm(center, { lat: p.latitude!, lon: p.longitude! }) })).filter((p: any) => p._d <= radiusKm).sort((a: any, b: any) => (b.avg_rating ?? 4.2) - (a.avg_rating ?? 4.2) || a._d - b._d)
        if (candidates.length >= 2) {
          const calcN = Math.min(candidates.length, Math.max(2, Math.min(10, Math.round(deadlineMin / 25))))
          const pick = candidates.slice(0, calcN)
          const routable = pick.map((p: any) => ({ id: p.id, name: p.name, slug: p.slug, area: p.area, latitude: p.latitude, longitude: p.longitude }))
          const res = await getOptimizedRoute(routable as any)
          let optimized: string[], distanceKm: string, durationMin: number
          if (res) { optimized = res.optimizedPandals.map((p) => p.slug); distanceKm = (res.distance / 1000).toFixed(1); durationMin = Math.round(res.duration / 60) } else { const fb = fallbackNearestOrder(routable as any); optimized = fb.map((p) => p.slug); let d = 0; for (let i = 1; i < fb.length; i++) d += haversineKm({ lat: fb[i - 1].latitude, lon: fb[i - 1].longitude }, { lat: fb[i].latitude, lon: fb[i].longitude }); distanceKm = d.toFixed(1); durationMin = Math.round((d * 1000) / 1.4 / 60) }
          const total = durationMin + calcN * 18
          reply = `${center.label} (${radiusKm}km, ${deadlineMin}min):\n` + optimized.map((s) => `• [${beautify(s)}](/pandal/${s})`).join('\n') + `\n~${distanceKm}km • ${durationMin}min travel + ${calcN * 18}min visits = ${total}/${deadlineMin}min\n[Browse](/browse?area=${encodeURIComponent(area)}) — Save? private/public?`
          reply = reply.split('\n').slice(0, 5).join('\n').slice(0, 520)
          const streamH = createUIMessageStream({ execute: ({ writer }) => { writer.write({ type: 'text-start', id: '0' }); writer.write({ type: 'text-delta', id: '0', delta: reply }); writer.write({ type: 'text-end', id: '0' }) } })
          return createUIMessageStreamResponse({ stream: streamH })
        }
      }
    } catch {}
  }

  // Admin Suggested routes
  if (text.includes('admin') && text.includes('route')) {
    try {
      const supabase = createServerClient()
      let q = supabase.from('puja_routes').select('id,title,admin_area,username,ordered_slugs').eq('username', 'Admin Suggested').eq('is_public', true).order('created_at', { ascending: false }).limit(10)
      // filter by area if mentioned
      if (text.includes('behala')) q = supabase.from('puja_routes').select('id,title,admin_area,username,ordered_slugs').eq('username', 'Admin Suggested').ilike('admin_area', '%behala%').eq('is_public', true).limit(10)
      else if (text.includes('garia')) q = supabase.from('puja_routes').select('id,title,admin_area,username,ordered_slugs').eq('username', 'Admin Suggested').ilike('admin_area', '%garia%').eq('is_public', true).limit(10)
      else if (text.includes('jadavpur')) q = supabase.from('puja_routes').select('id,title,admin_area,username,ordered_slugs').eq('username', 'Admin Suggested').ilike('admin_area', '%jadavpur%').eq('is_public', true).limit(10)
      const { data: routes } = await q
      if (routes && routes.length) {
        reply = `Admin Suggested routes:\n` + routes.slice(0, 4).map((r: any) => `• [${r.title}](/pujo-routing/${r.id}) • ${r.admin_area || ''}`).join('\n') + `\n[Browse all](/pujo-routing)`
        reply = reply.split('\n').slice(0, 5).join('\n').slice(0, 520)
        const streamA = createUIMessageStream({ execute: ({ writer }) => { writer.write({ type: 'text-start', id: '0' }); writer.write({ type: 'text-delta', id: '0', delta: reply }); writer.write({ type: 'text-end', id: '0' }) } })
        return createUIMessageStreamResponse({ stream: streamA })
      } else {
        reply = `No Admin Suggested routes for that area yet.\nTry [Public routes](/pujo-routing) or ask to plan hopping.`
        reply = reply.split('\n').slice(0, 5).join('\n')
        const streamA2 = createUIMessageStream({ execute: ({ writer }) => { writer.write({ type: 'text-start', id: '0' }); writer.write({ type: 'text-delta', id: '0', delta: reply }); writer.write({ type: 'text-end', id: '0' }) } })
        return createUIMessageStreamResponse({ stream: streamA2 })
      }
    } catch {}
  }

  if (text.includes('save')) {
    if (text.includes('private') || text.includes('public')) reply = 'Please login to save — [Login](/login) (same tab) and tell me private or public again.'
    else reply = 'Want me to save the last route as private or public for your account?'
  } else {
    reply =
      'Hi, I’m Vani ◆ — try:\n' +
      '• “Plan hopping South Kolkata near Kalighat 2km”\n' +
      '• “Recommend bus from Deshapriya Park to Hindustan Park”\n' +
      '• “List 4 pandals near Garia 2km”\n' +
      '• “How crowded is Sreebhumi at 8pm?”\n' +
      'All links same-tab. Ask to save — private/public?'
  }
  reply = reply.split('\n').slice(0, 5).join('\n').slice(0, 520)

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: 'text-start', id: '0' })
      writer.write({ type: 'text-delta', id: '0', delta: reply })
      writer.write({ type: 'text-end', id: '0' })
    },
  })
  return createUIMessageStreamResponse({ stream })
}
