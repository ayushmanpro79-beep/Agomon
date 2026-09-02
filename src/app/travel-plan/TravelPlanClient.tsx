'use client'
import { useState, useMemo, useEffect } from 'react'
import { findRoutes, allPlanList, rankPlans, availableStops, fareBus, fareMetro } from '@/lib/travelRouter'
import { supabase } from '@/lib/supabase/client'
import { haversineKm } from '@/lib/geo'
import { predictCrowd } from '@/lib/crowd'
import Link from 'next/link'

type PandalLite = { id: string; name: string; slug: string; area: string; latitude: number | null; longitude: number | null; avg_rating?: number | null }

export default function TravelPlanClient() {
  const [start, setStart] = useState('')
  const [dest, setDest] = useState('')
  const [mode, setMode] = useState<'time'|'budget'>('time')
  const [result, setResult] = useState<any>(null)
  const [crowdInfo, setCrowdInfo] = useState<string>('')
  const [pandals, setPandals] = useState<PandalLite[]>([])
  const [userLoc, setUserLoc] = useState<{ lat: number; lon: number } | null>(null)
  const [locating, setLocating] = useState(false)

  // load pandals for crowd + suggestions
  useEffect(() => {
    supabase.from('pandals').select('id,name,slug,area,latitude,longitude,avg_rating').order('name').then(({ data }) => setPandals((data as PandalLite[]) || []))
  }, [])

  const suggestions = useMemo(() => {
    const stops = availableStops()
    const names = [...new Set([...pandals.map(p => p.name), ...stops.slice(0, 80)])]
    return names
  }, [pandals])

  const locate = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(pos => {
      setUserLoc({ lat: pos.coords.latitude, lon: pos.coords.longitude })
      setLocating(false)
    }, () => setLocating(false), { enableHighAccuracy: true, timeout: 8000 })
  }

  const handleSearch = async () => {
    if (!start.trim() || !dest.trim()) return
    const res = findRoutes(start, dest)
    if (res.error) { setResult(res); return }
    // crowd boost for start if it's a pandal
    let boost: number | undefined
    const startPandal = pandals.find(p => p.name.toLowerCase() === start.toLowerCase().trim() || p.slug.toLowerCase() === start.toLowerCase().replace(/\s+/g,'-'))
    if (startPandal?.latitude && pandals.length) {
      const allLite = pandals.map(p => ({ id: p.id, latitude: p.latitude, longitude: p.longitude, area: p.area, avg_rating: p.avg_rating }))
      const nowHour = new Date().getHours() + new Date().getMinutes()/60
      boost = predictCrowd({ id: startPandal.id, latitude: startPandal.latitude, longitude: startPandal.longitude, area: startPandal.area, avg_rating: startPandal.avg_rating }, allLite as any, nowHour)
      if (boost >= 68) setCrowdInfo(`Crowd at ${startPandal.name} is High (${boost}%) — metro route prioritized`)
      else if (boost >= 48) setCrowdInfo(`Crowd at ${startPandal.name} is Moderate (${boost}%)`)
      else setCrowdInfo(`Crowd at ${startPandal.name} is Low (${boost}%) — comfortable`)
    } else setCrowdInfo('')
    // attach boost for ranking will be done in render via rankPlans
    setResult({ ...res, crowdBoost: boost })
  }

  const nearestInfo = useMemo(() => {
    if (!userLoc) return null
    const stops = availableStops().slice(0, 120)
    // simple nearest stop brute force via availableStops not geocoded — use pandals for nearest demo
    let best: any = null, bestDist = 1e9
    for (const p of pandals) if (p.latitude && p.longitude) {
      const d = haversineKm(userLoc, { lat: p.latitude, lon: p.longitude })
      if (d < bestDist) { bestDist = d; best = p }
    }
    return best ? `${best.name} • ${bestDist.toFixed(1)}km away` : null
  }, [userLoc, pandals])

  const plans = result && !result.error ? rankPlans(allPlanList(result), mode, result.crowdBoost) : []

  return (
    <div className="max-w-3xl mx-auto">
      <div className="glass-strong rounded-3xl p-5 md:p-6">
        <p className="text-[#FFD60A]/60 tracking-[0.2em] text-[10px]">TRAVEL PLAN • যাত্রা</p>
        <h1 className="text-xl md:text-2xl font-bold text-white mt-1">Travel Plan — Shortest Bus & Train</h1>
        <p className="text-xs text-white/50 mt-1">Enter any pandal, suburb, area, station, landmark or mall — we give the fastest route.</p>

        {/* Credit — name + link, no profile pic */}
        <p className="text-[11px] text-white/30 mt-2">Bus graph & metro connections by <a href="https://github.com/Akash190104/kolkata-travel-router" target="_blank" rel="noopener" className="text-[#FFD60A]/70 hover:text-[#FFD60A] underline">Akash190104 / kolkata-travel-router</a> — thank you for open data.</p>

        {/* Location */}
        <div className="mt-4 flex gap-2">
          <button onClick={locate} disabled={locating} className="text-xs bg-[#FFD60A]/10 border border-[#FFD60A]/20 text-[#FFD60A] px-3 py-2 rounded-full">{locating ? 'Locating…' : '📍 Use my location'}</button>
          {nearestInfo && <span className="text-xs text-white/40 self-center">Nearest: {nearestInfo}</span>}
        </div>

        {/* Inputs */}
        <div className="grid md:grid-cols-2 gap-3 mt-4">
          <div>
            <label className="text-xs text-[#FFD60A]/70">Start</label>
            <input list="agomon-stops" value={start} onChange={e => setStart(e.target.value)} placeholder="Chetla Agrani Club, Tollygunge, Sealdah, South City Mall…" className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[#020617]/60 border border-[#FFD60A]/10 outline-none text-sm text-white placeholder:text-white/30 focus:border-[#FFD60A]/30" />
          </div>
          <div>
            <label className="text-xs text-[#FFD60A]/70">Destination</label>
            <input list="agomon-stops" value={dest} onChange={e => setDest(e.target.value)} placeholder="Ahiritala Sarbojanin, Shyambazar, Esplanade…" className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[#020617]/60 border border-[#FFD60A]/10 outline-none text-sm text-white placeholder:text-white/30 focus:border-[#FFD60A]/30" />
          </div>
        </div>
        <datalist id="agomon-stops">
          {suggestions.slice(0, 200).map(s => <option key={s} value={s} />)}
        </datalist>

        {/* Toggle Time vs Budget */}
        <div className="mt-4 flex items-center gap-2">
          <div className="inline-flex p-1 rounded-full bg-[#020617] border border-[#FFD60A]/10">
            <button onClick={() => setMode('time')} className={`px-4 py-1.5 rounded-full text-xs font-semibold ${mode==='time'?'bg-[#FFD60A] text-[#020617]':'text-white/60'}`}>⏱ Time</button>
            <button onClick={() => setMode('budget')} className={`px-4 py-1.5 rounded-full text-xs font-semibold ${mode==='budget'?'bg-[#FFD60A] text-[#020617]':'text-white/60'}`}>₹ Budget</button>
          </div>
          <span className="text-[11px] text-white/30">{mode==='time'?'Least time (fare may be higher)':'Lowest fare (time may be higher)'} — both show fare & time</span>
        </div>

        <button onClick={handleSearch} className="mt-4 w-full bg-[#FFD60A] text-[#020617] py-3 rounded-full text-sm font-semibold">Find route — Chetla Agrani → Ahiritala example</button>

        {crowdInfo && <p className="text-xs text-[#FFD60A]/70 mt-3">{crowdInfo} — if High, metro prioritized.</p>}

        {/* Results */}
        <div className="mt-6 space-y-3">
          {result?.error && <p className="text-sm text-red-400">Unknown stop — try alias like Sovabazar → Shobhabazar. Origin: {result.origin}, Dest: {result.dest}</p>}
          {plans.map((pl: any, i: number) => (
            <div key={i} className="p-4 rounded-2xl glass border border-[#FFD60A]/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#FFD60A]">{pl.kind === 'mixed' ? 'Bus + Train' : pl.kind === 'metro' ? 'Train/Metro only' : 'Bus only'} • {pl.legs.length} leg{pl.legs.length>1?'s':''}</span>
                <span className="text-xs text-white/40">⏱ {pl.timeMin} min • ₹{pl.fare}</span>
              </div>
              <div className="mt-2 space-y-2">
                {pl.legs.map((leg: any, j: number) => (
                  <div key={j} className="flex gap-2 text-sm">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${leg.kind==='metro'?'bg-[#FFD60A] text-[#020617]':'bg-[#0B1220] border border-[#FFD60A]/20 text-[#FFD60A]'}`}>{leg.route}</span>
                    <span className="text-white/80">{leg.from} → {leg.to}</span>
                    <span className="text-white/30 text-xs self-center">({leg.stops.length-1} stops{leg.towards ? ` towards ${leg.towards}`:''})</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-white/20 mt-2">Route engine picks best of bus-only vs train-only vs bus+train for this toggle.</p>
            </div>
          ))}
          {result && !result.error && plans.length===0 && <p className="text-xs text-white/30 text-center py-6">No direct/one/two-change route found — try nearer stops like Esplanade, Sealdah, Tollygunge.</p>}
        </div>

        <div className="mt-6 p-3 rounded-xl bg-[#020617]/40 border border-[#FFD60A]/5">
          <p className="text-xs text-white/50">Time vs Budget: both cards show <span className="text-white">fare & predicted time</span>. Time toggle sorts by `timeMin` (metro boosted when crowd High), Budget toggle sorts by `fare` (stage fare from <code className="bg-[#0B1220] px-1 rounded">data/busRates.json</code> + stations crossed from <code className="bg-[#0B1220] px-1 rounded">data/metroRates.json</code>). Data: <code>data/busdata.json</code> 1919 routes, 2233 stops.</p>
          <p className="text-[11px] text-white/30 mt-1">Example: Chetla Agrani Club → Ahiritala Sarbojanin: try `Chetla` → `Ahiritola` or `Sovabazar` — router will suggest Bus or Metro+Bus with time & fare.</p>
        </div>
      </div>
    </div>
  )
}
