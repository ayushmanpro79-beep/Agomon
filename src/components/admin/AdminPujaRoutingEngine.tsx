'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { haversineKm, KOLKATA_METROS } from '@/lib/geo'
import { LANDMARKS } from '@/lib/crowd'
import { STATIONS } from '@/lib/trainStations'
import { AREAS } from '@/lib/searchEngine'
import { getOptimizedRoute, fallbackNearestOrder, RoutablePandal } from '@/lib/pujoRouting'
import PandalMap from '@/components/map/PandalMap'

type PandalLite = { id: string; name: string; slug: string; area: string; latitude: number | null; longitude: number | null; avg_rating?: number | null; rating_count?: number | null; address?: string | null }

const AREA_ALIAS_MAP: Record<string, string> = {
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
  'dum dum': 'dumdum',
  'dumdum': 'dumdum',
  'south kolkata': 'south kolkata',
  'west kolkata & behala': 'west kolkata & behala',
  'west kolkata': 'west kolkata & behala',
  'behala': 'west kolkata & behala',
  'central kolkata': 'central kolkata',
  'esplanade': 'central kolkata',
  'park street': 'central kolkata',
  'north kolkata': 'north kolkata',
  // direct for engine
  'garia': 'garia',
  'jadavpur': 'jadavpur',
  'kalighat': 'kalighat',
  'sovabazar': 'sovabazar',
  'shobhabazar': 'sovabazar',
}

const AREA_PROPER: Record<string, string> = {}
AREAS.forEach((a) => (AREA_PROPER[a.toLowerCase()] = a))

// quick helper to beautify slug
function beautify(s: string) {
  return s
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export default function AdminPujaRoutingEngine() {
  const [pandals, setPandals] = useState<PandalLite[]>([])
  const [areaInput, setAreaInput] = useState('Garia')
  const [radius, setRadius] = useState(3) // km
  const [deadline, setDeadline] = useState(120) // minutes
  const [title, setTitle] = useState('')
  const [preview, setPreview] = useState<{ optimized: RoutablePandal[]; distance: number; duration: number; geojson: any; candidates: PandalLite[]; center: { lat: number; lon: number; label: string; kind: string }; n: number; totalEstMin: number } | null>(null)
  const [generating, setGenerating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [adminRoutes, setAdminRoutes] = useState<any[]>([])
  const [adminLoading, setAdminLoading] = useState(false)

  useEffect(() => {
    supabase.from('pandals').select('id,name,slug,area,latitude,longitude,avg_rating,rating_count,address').order('name').then(({ data }) => setPandals((data as any) || []))
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null))
    return () => sub.subscription.unsubscribe()
  }, [])

  const fetchAdminRoutes = async () => {
    setAdminLoading(true)
    try {
      const { data } = await supabase.from('puja_routes').select('id,title,username,ordered_slugs,distance_m,created_at').eq('username', 'Admin Suggested').order('created_at', { ascending: false }).limit(20)
      setAdminRoutes((data as any) || [])
    } catch {}
    setAdminLoading(false)
  }
  useEffect(() => {
    fetchAdminRoutes()
  }, [])

  const handleAdminDelete = async (id: string) => {
    if (!user) {
      setErr('Login required to delete admin routes')
      return
    }
    if (!window.confirm('Delete this Admin Suggested route?')) return
    try {
      const { error } = await supabase.from('puja_routes').delete().eq('id', id)
      if (error) throw error
      setAdminRoutes((prev) => prev.filter((r) => r.id !== id))
      setMsg('Admin route deleted')
    } catch (e: any) {
      setErr(e.message || 'Delete failed — ensure you are admin owner. If RLS blocks, run migration_admin_suggested_routes.sql')
    }
  }

  const suggestions = useMemo(() => {
    const base = [...AREAS, 'Garia', 'Jadavpur', 'Kalighat', 'Sovabazar', 'Shobhabazar', 'Behala', ...LANDMARKS.map((l) => l.name), ...KOLKATA_METROS.map((m) => m.name), ...STATIONS.map((s) => s.name)]
    return Array.from(new Set(base))
  }, [])

  const filteredSuggestions = useMemo(() => {
    if (!areaInput.trim()) return suggestions.slice(0, 8)
    const q = areaInput.toLowerCase()
    return suggestions.filter((s) => s.toLowerCase().includes(q)).slice(0, 8)
  }, [areaInput, suggestions])

  function resolveCenter(qRaw: string, all: PandalLite[]): { lat: number; lon: number; label: string; kind: string } | null {
    const q = qRaw.trim().toLowerCase().replace(/\s+/g, ' ')
    if (!q) return null

    // 1) Area check — canonical areas
    // check alias map first
    for (const [alias, canonical] of Object.entries(AREA_ALIAS_MAP)) {
      const re = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
      if (re.test(q) || q === alias) {
        // if canonical is real area, compute centroid
        if (AREAS.map((a) => a.toLowerCase()).includes(canonical)) {
          const proper = AREA_PROPER[canonical] || canonical
          const inArea = all.filter((p) => p.area.toLowerCase() === canonical && p.latitude && p.longitude) as any[]
          if (inArea.length) {
            const lat = inArea.reduce((s, p) => s + p.latitude!, 0) / inArea.length
            const lon = inArea.reduce((s, p) => s + p.longitude!, 0) / inArea.length
            return { lat, lon, label: proper, kind: 'area' }
          }
        } else {
          // for garia etc, fall through to landmark/metro to get precise point, but keep alias as label
          // continue to next checks with original q
          break
        }
      }
    }
    // direct AREAS lower includes
    if (AREAS.map((a) => a.toLowerCase()).includes(q)) {
      const proper = AREA_PROPER[q] || qRaw
      const inArea = all.filter((p) => p.area.toLowerCase() === q && p.latitude && p.longitude) as any[]
      if (inArea.length) {
        const lat = inArea.reduce((s, p) => s + p.latitude!, 0) / inArea.length
        const lon = inArea.reduce((s, p) => s + p.longitude!, 0) / inArea.length
        return { lat, lon, label: proper, kind: 'area' }
      }
    }

    // 2) Landmark check
    const lm = LANDMARKS.find((l) => {
      const ln = l.name.toLowerCase()
      return ln === q || ln.includes(q) || q.includes(ln) || (q.length >= 4 && q.split(/\s+/).some((tok) => tok.length >= 4 && ln.includes(tok)))
    })
    if (lm) return { lat: lm.lat, lon: lm.lon, label: lm.name, kind: 'landmark' }

    // 3) Metro / Station check
    const qNorm = q.replace(/[^a-z0-9]/g, '')
    const allStations = [...KOLKATA_METROS.map((m) => ({ name: m.name, lat: m.lat, lon: m.lon })), ...STATIONS.map((s) => ({ name: s.name, lat: s.lat, lon: s.lon }))]
    const exact = allStations.find((s) => s.name.toLowerCase().replace(/[^a-z0-9]/g, '') === qNorm || s.name.toLowerCase() === q)
    if (exact) return { lat: exact.lat, lon: exact.lon, label: exact.name, kind: 'metro' }
    const includes = allStations.find((s) => s.name.toLowerCase().includes(q) || q.includes(s.name.toLowerCase()))
    if (includes) return { lat: includes.lat, lon: includes.lon, label: includes.name, kind: 'metro' }

    // 4) Pandal address/area fallback — for Behala etc, if still not found, try pandal cluster centroid near that suburb word
    const nearbyPandals = all.filter((p) => p.address?.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
    if (nearbyPandals.length) {
      const withCoords = nearbyPandals.filter((p) => p.latitude && p.longitude) as any[]
      if (withCoords.length) {
        const lat = withCoords.reduce((s, p) => s + p.latitude!, 0) / withCoords.length
        const lon = withCoords.reduce((s, p) => s + p.longitude!, 0) / withCoords.length
        return { lat, lon, label: qRaw, kind: 'area' }
      }
    }

    return null
  }

  const calculateN = (deadlineMin: number, available: number) => {
    // Realistic directly proportional: ~25 min per pandal (15 visit + 8-10 travel)
    // 60m -> 2, 90->4, 120->5, 180->7, 240->10
    const base = Math.round(deadlineMin / 25)
    const clamped = Math.max(2, Math.min(10, base))
    return Math.min(clamped, available)
  }

  const handleGenerate = async () => {
    setErr(null)
    setMsg(null)
    setPreview(null)
    if (!areaInput.trim()) {
      setErr('Enter area (e.g., Garia, Jadavpur, Kalighat, Sovabazar, Behala)')
      return
    }
    if (pandals.length === 0) {
      setErr('Pandals not loaded yet')
      return
    }
    const center = resolveCenter(areaInput, pandals)
    if (!center) {
      setErr(`Area "${areaInput}" not found. Try: Garia, Jadavpur, Kalighat, Sovabazar, Behala, or South Kolkata etc. (checked Area → Landmark → Metro)`)
      return
    }

    setGenerating(true)
    try {
      // filter by radius
      const candidates = pandals
        .filter((p) => p.latitude && p.longitude)
        .map((p) => ({ ...p, _dist: haversineKm(center, { lat: p.latitude!, lon: p.longitude! }) }))
        .filter((p: any) => p._dist <= radius)
        .sort((a: any, b: any) => {
          // sort by rating desc, then distance asc, so best nearby first
          const ra = (a.avg_rating ?? 4.2) - (b.avg_rating ?? 4.2)
          if (ra !== 0) return -ra
          return a._dist - b._dist
        })

      if (candidates.length < 2) {
        setErr(`Only ${candidates.length} pandal(s) within ${radius}km of ${center.label} (${center.kind}). Increase radius.`)
        setGenerating(false)
        return
      }

      let n = calculateN(deadline, candidates.length)
      // iteratively try to fit within deadline: estimate total = travel + visit
      // we don't know travel until OSRM, so first pick top n, then optimize, then check total vs deadline, reduce if over

      let best: { optimized: RoutablePandal[]; distance: number; duration: number; geojson: any } | null = null
      let attemptN = n
      let lastCandidates: PandalLite[] = []

      while (attemptN >= 2) {
        const pick = candidates.slice(0, attemptN)
        const routable: RoutablePandal[] = pick.map((p) => ({ id: p.id, name: p.name, slug: p.slug, area: p.area, latitude: p.latitude!, longitude: p.longitude! }))
        // try OSRM
        const res = await getOptimizedRoute(routable)
        if (res) {
          const travelMin = res.duration / 60
          const visitMin = attemptN * 15 // 15 min per pandal realistic
          const bufferMin = attemptN * 3 // crowd/walk buffer
          const total = travelMin + visitMin + bufferMin
          if (total <= deadline || attemptN === 2) {
            best = { optimized: res.optimizedPandals, distance: res.distance, duration: res.duration, geojson: res.geojson }
            lastCandidates = pick
            n = attemptN
            // store total for display
            break
          } else {
            // too long, reduce one pandal and retry
            attemptN -= 1
            continue
          }
        } else {
          // OSRM failed, fallback
          const fb = fallbackNearestOrder(routable)
          let distKm = 0
          for (let i = 1; i < fb.length; i++) distKm += haversineKm({ lat: fb[i - 1].latitude, lon: fb[i - 1].longitude }, { lat: fb[i].latitude, lon: fb[i].longitude })
          const duration = (distKm * 1000) / 1.4 // walk speed fallback
          const travelMin = duration / 60
          const total = travelMin + attemptN * 15 + attemptN * 3
          if (total <= deadline || attemptN === 2) {
            const fbCoords = fb.map((p) => [p.longitude, p.latitude] as [number, number])
            const geojson = { type: 'FeatureCollection' as const, features: [{ type: 'Feature' as const, geometry: { type: 'LineString' as const, coordinates: fbCoords }, properties: { fallback: true } }] }
            best = { optimized: fb, distance: distKm * 1000, duration, geojson: geojson as any }
            lastCandidates = pick
            n = attemptN
            break
          } else {
            attemptN -= 1
            continue
          }
        }
      }

      if (!best) {
        setErr('Failed to optimize route — try larger radius or longer deadline')
        setGenerating(false)
        return
      }

      const travelMin = Math.round(best.duration / 60)
      const totalEstMin = travelMin + n * 15 + n * 3
      // auto title if empty
      if (!title) {
        const names = best.optimized.map((p) => p.name)
        if (names.length === 2) setTitle(`${names[0]} → ${names[1]}`)
        else if (names.length > 2) setTitle(`${names[0]} → +${names.length - 2} → ${names[names.length - 1]}`)
      }

      setPreview({
        optimized: best.optimized,
        distance: best.distance,
        duration: best.duration,
        geojson: best.geojson,
        candidates: lastCandidates,
        center,
        n,
        totalEstMin,
      })
      setMsg(`Generated ${n} pandals for ${deadline}min deadline (${center.kind}: ${center.label}, ${radius}km). Travel ${travelMin}min + visit ${n * 15}min + buffer ${n * 3}min = ~${totalEstMin}min`)
    } catch (e: any) {
      setErr(e.message || 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const handlePublish = async () => {
    if (!preview) {
      setErr('Generate preview first')
      return
    }
    if (!title.trim() || title.trim().length < 3) {
      setErr('Title 3-60 chars required. Name the route before publishing.')
      return
    }
    if (!user) {
      setErr('Admin must be logged in via Supabase (Login page) to publish. Please login first.')
      return
    }
    setPublishing(true)
    setErr(null)
    setMsg(null)
    try {
      const orderedIds = preview.optimized.map((p) => p.id)
      const orderedSlugs = preview.optimized.map((p) => p.slug)
      const { data, error } = await supabase
        .from('puja_routes')
        .insert({
          user_id: user.id,
          username: 'Admin Suggested',
          title: title.trim(),
          description: `${orderedSlugs.length} pandals • ${(preview.distance / 1000).toFixed(1)} km • Admin Suggested • ${preview.center.label} • ${radius}km • ${deadline}min`,
          pandal_ids: orderedIds,
          ordered_slugs: orderedSlugs,
          distance_m: Math.round(preview.distance),
          duration_s: Math.round(preview.duration),
          geojson: preview.geojson,
          is_public: true,
          // optional columns if migration exists — safe to send, will be ignored if not exists? Supabase will error if column missing. So only send if exists.
          // we try with is_admin_suggested, fallback without
        })
        .select('id')
        .single()

      if (error) {
        // if error mentions is_admin_suggested missing, retry without extra fields (but we didn't send them)
        throw error
      }

      // try to patch admin flags if columns exist — best effort, ignore if fails
      try {
        await supabase
          .from('puja_routes')
          .update({ is_admin_suggested: true, admin_area: preview.center.label, search_radius_km: radius, time_deadline_min: deadline } as any)
          .eq('id', data.id)
      } catch {}

      setMsg(`Published as Admin Suggested → /pujo-routing/${data.id}`)
      setPreview(null)
      setTitle('')
      fetchAdminRoutes()
    } catch (e: any) {
      if (e.message?.includes('puja_routes') || e.message?.includes('does not exist')) {
        setErr('Table not migrated. Run supabase migration for puja_routes.')
      } else {
        setErr(e.message)
      }
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="bg-[#0B1220] border border-[#FFD60A]/10 rounded-2xl p-4 mt-6">
      <h2 className="text-sm font-bold text-[#FFD60A]">Puja Routing Engine — Admin Suggested</h2>
      <p className="text-xs text-white/40 mt-1">Area → Landmark → Metro (spot-on mapping). Radius + time deadline → realistic pandal count (directly proportional). Name before publish.</p>

      {!user && <p className="text-[11px] text-amber-300/80 mt-2">Login via /login first (admin account) — publishing requires Supabase auth + `agomon_admin` password.</p>}

      <div className="grid md:grid-cols-2 gap-3 mt-3">
        <div className="relative">
          <label className="text-xs text-white/60">Area of search</label>
          <input
            value={areaInput}
            onChange={(e) => setAreaInput(e.target.value)}
            placeholder="Garia, Jadavpur, Kalighat, Sovabazar, Behala..."
            className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[#020617] border border-[#FFD60A]/10 outline-none text-sm text-white placeholder:text-white/30"
            list="admin-area-list"
          />
          <datalist id="admin-area-list">
            {filteredSuggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <p className="text-[10px] text-white/25 mt-1">Checked: Area → Landmark → Metro. Try Garia/Jadavpur etc.</p>
        </div>
        <div>
          <label className="text-xs text-white/60">Radius (km)</label>
          <div className="flex items-center gap-2 mt-1">
            <input type="range" min={1} max={6} step={0.5} value={radius} onChange={(e) => setRadius(parseFloat(e.target.value))} className="flex-1 accent-[#FFD60A]" />
            <span className="text-sm font-semibold text-[#FFD60A] w-12 text-right">{radius} km</span>
          </div>
          <p className="text-[10px] text-white/25 mt-1">1–6 km around center</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3 mt-3">
        <div>
          <label className="text-xs text-white/60">Time deadline (min)</label>
          <select value={deadline} onChange={(e) => setDeadline(parseInt(e.target.value))} className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[#020617] border border-[#FFD60A]/10 text-sm text-white outline-none">
            <option value={60}>60 min — ~2 pandals</option>
            <option value={90}>90 min — ~4 pandals</option>
            <option value={120}>120 min — ~5 pandals</option>
            <option value={180}>180 min — ~7 pandals</option>
            <option value={240}>240 min — ~9-10 pandals</option>
          </select>
          <p className="text-[10px] text-white/25 mt-1">Directly proportional: longer time → more pandals (OSRM + 15min per pandal visit)</p>
        </div>
        <div>
          <label className="text-xs text-white/60">Route title (admin names before publish) *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Garia Night Hopper → +3 → Baghajatin" maxLength={60} className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[#020617] border border-[#FFD60A]/10 outline-none text-sm text-white placeholder:text-white/30" />
          <p className="text-[10px] text-white/25 mt-1">{title.length}/60</p>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button onClick={handleGenerate} disabled={generating} className="flex-1 bg-[#FFD60A] disabled:opacity-50 text-[#020617] py-2.5 rounded-xl text-sm font-semibold">
          {generating ? 'Generating…' : 'Generate Preview'}
        </button>
        <button onClick={handlePublish} disabled={publishing || !preview} className="flex-1 bg-[#0B1220] border border-[#FFD60A]/20 disabled:opacity-40 text-[#FFD60A] py-2.5 rounded-xl text-sm font-semibold">
          {publishing ? 'Publishing…' : 'Publish as Admin Suggested'}
        </button>
      </div>

      {err && <p className="text-xs text-red-400 mt-3 bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2">{err}</p>}
      {msg && <p className="text-xs text-emerald-300 mt-3 bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-3 py-2">{msg}</p>}

      {preview && (
        <div className="mt-4 p-3 rounded-2xl bg-[#020617]/60 border border-[#FFD60A]/10">
          <p className="text-xs font-semibold text-[#FFD60A]">Preview — {preview.center.label} ({preview.center.kind}) • {preview.n} pandals • {(preview.distance / 1000).toFixed(1)} km • {Math.round(preview.duration / 60)} min travel • ~{preview.totalEstMin} min total</p>
          <p className="text-[11px] text-white/40 mt-1">Time check: travel {Math.round(preview.duration / 60)} + visit {preview.n * 15} + buffer {preview.n * 3} = {preview.totalEstMin} ≤ {deadline} ✓</p>
          <div className="mt-3">
            <PandalMap pandals={preview.optimized.map((p: any) => ({ id: p.id, name: p.name, slug: p.slug, area: p.area, latitude: p.latitude, longitude: p.longitude }))} routeGeoJson={preview.geojson} />
          </div>
          <ol className="mt-3 space-y-1.5">
            {preview.optimized.map((p, i) => (
              <li key={p.id} className="flex items-center gap-2 text-sm bg-[#020617]/40 border border-[#FFD60A]/10 rounded-xl px-3 py-2">
                <span className="w-7 h-7 rounded-full bg-[#FFD60A] text-[#020617] flex items-center justify-center text-xs font-bold">{i + 1}</span>
                <span className="text-white flex-1 truncate">{p.name}</span>
                <span className="text-xs text-white/30">{p.area}</span>
              </li>
            ))}
          </ol>
          <p className="text-[10px] text-white/25 mt-2 text-center">Optimized via OSRM Trip (source=first=false). Admin can rename above before publishing.</p>
        </div>
      )}

      {/* Admin Suggested manager — admin only delete */}
      <div className="mt-6 p-3 rounded-2xl bg-[#020617]/40 border border-purple-500/20">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-purple-300">Admin Suggested Routes</h3>
          <button onClick={fetchAdminRoutes} disabled={adminLoading} className="text-[11px] glass border border-purple-500/20 text-purple-300 px-2.5 py-1 rounded-full pc-btn disabled:opacity-50">
            {adminLoading ? 'Loading…' : '↻ Refresh'}
          </button>
        </div>
        <p className="text-[11px] text-white/30 mt-1">Public routes with username “Admin Suggested”. Only admin can delete here (regular users see delete blocked in feed).</p>
        {adminRoutes.length === 0 ? (
          <p className="text-xs text-white/40 mt-3 text-center py-3">No Admin Suggested routes yet — generate above and publish.</p>
        ) : (
          <div className="mt-3 space-y-2 max-h-[320px] overflow-y-auto">
            {adminRoutes.map((r) => (
              <div key={r.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-[#0B1220] border border-purple-500/10">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{r.title}</p>
                  <p className="text-[11px] text-white/30 truncate">{r.distance_m ? `${(r.distance_m / 1000).toFixed(1)} km` : ''} • {new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <a href={`/pujo-routing/${r.id}`} target="_blank" className="text-xs text-[#FFD60A]/70 underline">View</a>
                <button onClick={() => handleAdminDelete(r.id)} className="text-xs bg-red-500/10 border border-red-500/20 text-red-300 px-2.5 py-1 rounded-full hover:bg-red-500/15 pc-btn">Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
