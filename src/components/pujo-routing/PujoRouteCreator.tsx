'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { getOptimizedRoute, fallbackNearestOrder, RoutablePandal } from '@/lib/pujoRouting'
import PandalMap from '@/components/map/PandalMap'
import SectionBorder from '@/components/ui/SectionBorder'
import { haversineKm } from '@/lib/geo'

type PandalLite = { id: string; name: string; slug: string; area: string; latitude: number | null; longitude: number | null }

export default function PujoRouteCreator() {
  const [pandals, setPandals] = useState<PandalLite[]>([])
  const [q, setQ] = useState('')
  const [area, setArea] = useState<string>('All')
  const [selected, setSelected] = useState<PandalLite[]>([])
  const [useLive, setUseLive] = useState(false)
  const [userLoc, setUserLoc] = useState<{ lat: number; lon: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [result, setResult] = useState<{ optimized: RoutablePandal[]; distance: number; duration: number; geojson: any } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.from('pandals').select('id,name,slug,area,latitude,longitude').order('name').then(({ data }) => setPandals((data as PandalLite[]) || []))
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  const areas = useMemo(() => ['All', ...Array.from(new Set(pandals.map((p) => p.area)))], [pandals])
  const filtered = useMemo(() => {
    let list = pandals
    if (area !== 'All') list = list.filter((p) => p.area === area)
    if (q.trim()) {
      const k = q.toLowerCase()
      list = list.filter((p) => p.name.toLowerCase().includes(k) || p.area.toLowerCase().includes(k) || p.slug.includes(k))
    }
    return list.slice(0, 60)
  }, [pandals, q, area])

  const toggle = (p: PandalLite) => {
    setResult(null)
    setSavedId(null)
    setError(null)
    if (selected.find((s) => s.id === p.id)) setSelected((s) => s.filter((x) => x.id !== p.id))
    else {
      if (selected.length >= 10) { setError('Max 10 pandals for OSRM optimization — remove one first.'); return }
      if (!p.latitude || !p.longitude) { setError(`${p.name} has no coordinates`); return }
      setSelected((s) => [...s, p])
    }
  }

  const locate = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lon: pos.coords.longitude })
        setUseLive(true)
        setLocating(false)
      },
      () => { setError('Location denied — you can still optimize without live start'); setLocating(false) },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  const optimize = async () => {
    setError(null)
    setSavedId(null)
    if (selected.length < 2) { setError('Pick at least 2 pandals'); return }
    setOptimizing(true)
    try {
      const list: RoutablePandal[] = []
      if (useLive && userLoc) list.push({ id: 'you', name: 'Your Location', slug: 'you', area: 'You', latitude: userLoc.lat, longitude: userLoc.lon } as RoutablePandal)
      for (const p of selected) list.push(p as RoutablePandal)

      // include live location as fixed start (PUJO-APP source=first)
      const res = await getOptimizedRoute(list)
      if (res) {
        // strip the 'you' placeholder from optimized list for display but keep its road line
        const optimizedWithoutYou = res.optimizedPandals.filter((x) => x.id !== 'you') as PandalLite[]
        // keep original road line (includes start), but ordered pandals without 'you'
        setResult({ optimized: res.optimizedPandals as RoutablePandal[], distance: res.distance, duration: res.duration, geojson: res.geojson })
        // auto-title suggestion
        if (!title) setTitle(optimizedWithoutYou.slice(0, 2).map((p) => p.name).join(' → ') + (optimizedWithoutYou.length > 2 ? ` +${optimizedWithoutYou.length - 2}` : ''))
        // cache for instant re-open (fix long unresolved spinner)
        try { sessionStorage.setItem('agomon:lastRoute', JSON.stringify(res.geojson)) } catch {}
      } else {
        // fallback nearest — draw straight-line so route is always visible (fixes your screenshot: markers but no line)
        const fb = fallbackNearestOrder(list)
        const fbCoords = fb.map((p) => [p.longitude, p.latitude] as [number, number])
        const fallbackGeo = {
          type: 'FeatureCollection' as const,
          features: [{ type: 'Feature' as const, geometry: { type: 'LineString' as const, coordinates: fbCoords }, properties: { fallback: true } }],
        }
        // haversine sum for fallback km/min
        let distKm = 0
        for (let i = 1; i < fb.length; i++) distKm += haversineKm({ lat: fb[i - 1].latitude, lon: fb[i - 1].longitude }, { lat: fb[i].latitude, lon: fb[i].longitude })
        setError('OSRM busy — showed straight-line fallback (dashed). Tap Optimize again for road route.')
        setResult({ optimized: fb as RoutablePandal[], distance: distKm * 1000, duration: distKm * 1000 / 1.4, geojson: fallbackGeo as any })
      }
    } catch (e: any) {
      setError(e.message || 'Optimization failed')
    } finally {
      setOptimizing(false)
    }
  }

  const save = async () => {
    if (!user) { setError('Please login to save routes (or view optimized route locally)'); return }
    if (!result) { setError('Optimize first'); return }
    if (!title.trim() || title.trim().length < 3) { setError('Title 3-60 chars'); return }
    setSaving(true)
    setError(null)
    try {
      const orderedIds = result.optimized.filter((p) => p.id !== 'you').map((p) => p.id)
      const orderedSlugs = result.optimized.filter((p) => p.id !== 'you').map((p) => p.slug)
      const { data, error } = await supabase.from('puja_routes').insert({
        user_id: user.id,
        username: user.user_metadata?.username || user.email?.split('@')[0],
        title: title.trim(),
        description: `${orderedSlugs.length} pandals • ${(result.distance / 1000).toFixed(1)} km`,
        pandal_ids: orderedIds,
        ordered_slugs: orderedSlugs,
        distance_m: Math.round(result.distance),
        duration_s: Math.round(result.duration),
        geojson: result.geojson,
        is_public: isPublic,
      }).select('id').single()
      if (error) throw error
      setSavedId(data.id)
    } catch (e: any) {
      // table may not exist yet (read-only Migrate) — show friendly
      if (e.message?.includes('puja_routes') || e.message?.includes('does not exist')) {
        setError('Public routes table not yet migrated — run SQL in Supabase dashboard (see plan). Route is still viewable locally, not saved.')
      } else setError(e.message)
    } finally { setSaving(false) }
  }

  const routePandalsForMap: any[] = result ? result.optimized.filter((p) => p.id !== 'you').map((p: any) => ({ id: p.id, name: p.name, slug: p.slug, area: p.area, latitude: p.latitude, longitude: p.longitude })) : []
  const orderedForList = result ? result.optimized.filter((p) => p.id !== 'you') : []

  return (
    <div className="max-w-3xl mx-auto">
      <SectionBorder />
      <div className="glass-strong rounded-3xl p-4 md:p-6">
        <p className="text-[#FFD60A]/60 tracking-[0.2em] text-[10px]">PUJO ROUTING • CREATE</p>
        <h1 className="text-xl md:text-2xl font-bold text-white mt-1">Route Creator</h1>
        <p className="text-xs text-white/50 mt-1">Pick 2–10 pandals, use live GPS as fixed start (PUJO-APP logic), optimize via OSRM Trip.</p>
        <p className="text-[11px] text-white/25 mt-1">Credit: Route optimization via OSRM Trip (PUJO-APP by anujeetverma — MIT) blended with Agomon MapLibre & glass.</p>

        {/* Live + counts */}
        <div className="mt-4 flex flex-wrap gap-2 items-center">
          <button onClick={locate} disabled={locating} className={`text-xs px-3 py-2 rounded-full border ${useLive ? 'bg-[#FFD60A] text-[#020617] border-[#FFD60A]' : 'bg-[#FFD60A]/10 border-[#FFD60A]/20 text-[#FFD60A]'}`}>{locating ? 'Locating…' : useLive && userLoc ? `📍 Using live (${userLoc.lat.toFixed(3)}, ${userLoc.lon.toFixed(3)})` : '📍 Use my location as start'}</button>
          <span className="text-xs text-white/40">{selected.length}/10 selected {result ? `• ${(result.distance / 1000).toFixed(1)} km • ${Math.round(result.duration / 60)} min` : ''}</span>
          {selected.length > 0 && <button onClick={() => { setSelected([]); setResult(null) }} className="text-xs text-white/40 underline">Clear</button>}
        </div>

        {/* Search + area */}
        <div className="mt-4 grid md:grid-cols-[1fr_180px] gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pandal or area…" className="w-full px-3 py-2.5 rounded-xl bg-[#020617]/60 border border-[#FFD60A]/10 outline-none text-sm text-white placeholder:text-white/30" />
          <select value={area} onChange={(e) => setArea(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-[#020617]/60 border border-[#FFD60A]/10 text-sm text-white outline-none">
            {areas.map((a) => <option key={a} value={a} className="bg-[#0B1220]">{a}</option>)}
          </select>
        </div>

        {/* Selected chips */}
        {selected.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {selected.map((p, i) => (
              <span key={p.id} className="inline-flex items-center gap-1.5 text-xs bg-[#FFD60A]/15 border border-[#FFD60A]/20 text-[#FFD60A] px-2.5 py-1 rounded-full">
                <span className="w-5 h-5 rounded-full bg-[#FFD60A] text-[#020617] flex items-center justify-center text-[10px] font-bold">{i + 1}</span> {p.name}
                <button onClick={() => toggle(p)} className="ml-1 text-[#FFD60A]/60 hover:text-[#FFD60A]">×</button>
              </span>
            ))}
          </div>
        )}

        {/* Pandal picker */}
        <div className="mt-3 max-h-[220px] overflow-y-auto rounded-xl border border-[#FFD60A]/10 bg-[#020617]/40 divide-y divide-[#FFD60A]/5">
          {filtered.map((p) => {
            const sel = !!selected.find((s) => s.id === p.id)
            return (
              <button key={p.id} onClick={() => toggle(p)} className={`w-full text-left px-3 py-2.5 flex items-center justify-between ${sel ? 'bg-[#FFD60A]/10' : 'hover:bg-white/5'}`}>
                <div>
                  <p className="text-sm text-white leading-tight">{p.name}</p>
                  <p className="text-xs text-white/30">{p.area}</p>
                </div>
                <span className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs ${sel ? 'bg-[#FFD60A] border-[#FFD60A] text-[#020617]' : 'border-white/15 text-white/40'}`}>{sel ? '✓' : '+'}</span>
              </button>
            )
          })}
          {filtered.length === 0 && <p className="text-xs text-white/30 p-3 text-center">No pandals match</p>}
        </div>

        <button onClick={optimize} disabled={optimizing || selected.length < 2} className="mt-4 w-full bg-[#FFD60A] disabled:opacity-40 text-[#020617] py-3 rounded-full text-sm font-semibold">{optimizing ? 'Optimizing…' : `Optimize route — ${selected.length} pandals`}</button>
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}

        {/* Result map + ordered list — Agomon glass + numbered markers */}
        {result && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-[#FFD60A]/80 mb-2">Optimized order {useLive && userLoc && <span className="text-white/40 font-normal">• start fixed at Your Location</span>}</p>
            <PandalMap pandals={routePandalsForMap as any} userLocation={userLoc} routeGeoJson={result.geojson} metrosToShow={[]} />
            <ol className="mt-3 space-y-1.5">
              {orderedForList.map((p: any, i) => (
                <li key={p.id} className="flex items-center gap-2 text-sm bg-[#020617]/40 border border-[#FFD60A]/10 rounded-xl px-3 py-2">
                  <span className="w-7 h-7 rounded-full bg-[#FFD60A] text-[#020617] flex items-center justify-center text-xs font-bold">{i + 1}</span>
                  <span className="text-white flex-1 truncate">{p.name}</span>
                  <span className="text-xs text-white/30">{p.area}</span>
                  <Link href={`/pandal/${p.slug}`} className="text-xs text-[#FFD60A]/70 underline">View</Link>
                </li>
              ))}
            </ol>
            <p className="text-[11px] text-white/30 mt-2 text-center">Numbered markers on map = optimized road distance (PUJO-APP Trip TSP). Fallback to straight line if OSRM busy.</p>

            {/* Save */}
            <div className="mt-4 p-3 rounded-2xl bg-[#020617]/40 border border-[#FFD60A]/10">
              <label className="text-xs text-white/60">Route title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My North Kolkata night route" className="w-full mt-1 px-3 py-2 rounded-xl bg-[#020617]/60 border border-[#FFD60A]/10 text-sm text-white outline-none" maxLength={60} />
              <label className="mt-2 flex items-center gap-2 text-sm text-white/70"><input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="accent-[#FFD60A]" /> Public (visible on /pujo-routing)</label>
              {!user && <p className="text-[11px] text-amber-400 mt-1">Login to save — or screenshot the ordered list for now.</p>}
              <button onClick={save} disabled={saving || !!savedId} className="mt-2 w-full bg-[#0B1220] border border-[#FFD60A]/20 text-[#FFD60A] py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40">{savedId ? `Saved → View` : saving ? 'Saving…' : 'Save route'}</button>
              {savedId && <Link href={`/pujo-routing/${savedId}`} className="block text-center text-xs text-[#FFD60A] underline mt-2">Open /pujo-routing/{savedId}</Link>}
            </div>
          </div>
        )}
      </div>
      <SectionBorder className="mt-3 rotate-180" />
    </div>
  )
}
