'use client'
import { useState, useMemo, useEffect } from 'react'
import { findRoutes, allPlanList, rankPlans, availableStops, fareBus, fareMetro } from '@/lib/travelRouter'
import busdata from '@/../data/busdata.json'
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
    // include all pandals + bus stops + metro/local stations + metro connections depots
    const metroStations = (() => { try { const g=require('@/lib/geo'); return (g.KOLKATA_METROS||[]).map((m:any)=>m.name) } catch { return [] } })()
    const depots = (() => {
      // nearest bus stops from Kolkata_Metro_Bus_Connections.txt Section 2 (parsed manually as fallback list)
      const raw = ['Dakshineswar','Baranagar Bazar','Noapara (Tobin Road)','Dum Dum Station','Belgachia Metro','Shyambazar','Sovabazar Metro','Girish Park','M.G. Road Metro','Central Metro','Chandni Market','Esplanade','Park Street','Maidan Metro','Rabindra Sadan','Bhowanipore','Hazra More','Kalighat','Tollygunge Metro','Kudghat','Bansdroni','Naktala','Garia Bazar','Garia','Garia Metro','45 Bus Stand','Garia Bus Stand','Howrah Maidan','Howrah Station','BBD Bag','Dalhousie','Sealdah Station','Phoolbagan','Saltlake Stadium','Bengal Chemical','City Centre','Central Park','Karunamoyee','Sector V','SDF More','College More','Hiland Park','Kalikapur','Mukundapur','Ruby Crossing','VIP Bazar','Uttar Panchannagram','Science City','Beleghata','Dum Dum Cantonment','Airport Gate No. 1','Airport Domestic Terminus','Joka','Thakurpukur 3A','Sakher Bazar','Behala Chowrasta','Behala 14 No.','Taratala','Majherhat']
      return raw.map(s => s.replace(/\s*\(.*?\)\s*/g,'').trim())
    })()
    try {
      const st = require('@/lib/trainStations'); 
      const trainNames = (st.STATIONS||[]).map((s:any)=>s.name);
      const names = [...new Set([...pandals.map(p => p.name), ... pandals.map(p=>p.area), ...trainNames, ...metroStations, ...depots, ...stops])]
      return names
    } catch {
      return [...new Set([...pandals.map(p => p.name), ...stops])]
    }
  }, [pandals])

  const [showStart, setShowStart] = useState(false)
  const [showDest, setShowDest] = useState(false)
  const filteredStart = useMemo(() => {
    if (!start) return suggestions.slice(0, 30)
    const q = start.toLowerCase()
    return suggestions.filter(s => s.toLowerCase().includes(q)).slice(0, 30)
  }, [start, suggestions])
  const filteredDest = useMemo(() => {
    if (!dest) return suggestions.slice(0, 30)
    const q = dest.toLowerCase()
    return suggestions.filter(s => s.toLowerCase().includes(q)).slice(0, 30)
  }, [dest, suggestions])

  const locate = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(pos => {
      setUserLoc({ lat: pos.coords.latitude, lon: pos.coords.longitude })
      setLocating(false)
    }, () => setLocating(false), { enableHighAccuracy: true, timeout: 8000 })
  }

  // resolve pandal/area/landmark/mall to nearest bus stop via haversine (fixes unknown stop for pandal names)
  const resolveToStop = (raw: string): string => {
    const trimmed = raw.trim()
    if (!trimmed) return raw
    const key = trimmed.toLowerCase()
    const stopsSet = new Set(availableStops().map(s => s.toLowerCase()))
    if (stopsSet.has(key)) return trimmed
    // check alias mapping directly via busdata (e.g., Chetla -> Chetla Park)
    const aliasVal = (busdata as any).aliases?.[Object.keys((busdata as any).aliases).find(k => k.toLowerCase()===key) || '']
    if (aliasVal && stopsSet.has(aliasVal.toLowerCase())) return aliasVal
    // pandal name → nearest geocoded bus stop (busdata stops with lat/lng)
    const pandal = pandals.find(p => p.name.toLowerCase() === key || p.slug.toLowerCase() === key.replace(/\s+/g,'-') || p.name.toLowerCase().includes(key) || key.includes(p.name.toLowerCase().split(' ')[0]))
    if (pandal?.latitude && pandal?.longitude) {
      let best: string | null = null, bestDist = 1e9
      for (const s of (busdata as any).stops) if (s.lat != null && s.lng != null) {
        const d = haversineKm({ lat: pandal.latitude, lon: pandal.longitude }, { lat: s.lat, lon: s.lng })
        if (d < bestDist) { bestDist = d; best = s.name }
      }
      if (best && bestDist < 5) return best
      const areaHub: Record<string,string> = { 'South Kolkata':'Tollygunge','North Kolkata':'Shyambazar','Central Kolkata':'Esplanade','Dumdum':'Dum Dum','West Kolkata & Behala':'Behala Chowrasta','Salt Lake & Rajarhat':'Karunamoyee' }
      if (areaHub[pandal.area]) return areaHub[pandal.area]
      return 'Esplanade'
    }
    const areaHints: Record<string,string> = { 'chetla':'Chetla Park','ahiritola':'Ahiritola','ahiritala':'Ahiritola','sovabazar':'Sovabazar','shobhabazar':'Sovabazar','howrah':'Howrah Station','sealdah':'Sealdah','park street':'Park Street','esplanade':'Esplanade','tollygunge':'Tollygunge','jadavpur':'Jadavpur 8B','garia':'Garia','behala':'Behala Chowrasta','salt lake':'Karunamoyee','girish park':'Girish Park','shyambazar':'Shyambazar','belgachia':'Belgachia','dum dum':'Dum Dum' }
    for (const [k,v] of Object.entries(areaHints)) if (key.includes(k)) return v
    return trimmed
  }

  const handleSearch = async () => {
    if (!start.trim() || !dest.trim()) return
    const s = resolveToStop(start)
    const d = resolveToStop(dest)
    const res = findRoutes(s, d)
    if (res.error) { setResult({ ...res, resolvedFrom: { start: s, dest: d } }); return }
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
        <div className="mt-4 flex flex-wrap gap-2 items-center">
          <button onClick={locate} disabled={locating} className="text-xs bg-[#FFD60A]/10 border border-[#FFD60A]/20 text-[#FFD60A] px-3 py-2 rounded-full">{locating ? 'Locating…' : '📍 Use my location'}</button>
          <button
            onClick={() => {
              if (!userLoc) { locate(); return }
              let best: any = null, bestDist = 1e9
              for (const s of (busdata as any).stops) if ((s as any).lat != null && (s as any).lng != null) {
                const d = haversineKm(userLoc, { lat: (s as any).lat, lon: (s as any).lng })
                if (d < bestDist) { bestDist = d; best = s }
              }
              if (best) {
                const url = `https://www.google.com/maps/search/bus+stop/@${(best as any).lat},${(best as any).lng},17z`
                window.open(url, '_blank')
              } else {
                window.open(`https://www.google.com/maps/search/bus+stop/@${userLoc.lat},${userLoc.lon},16z`, '_blank')
              }
            }}
            className="text-xs bg-[#0B1220] border border-[#FFD60A]/20 text-[#FFD60A]/80 hover:text-[#FFD60A] px-3 py-2 rounded-full"
          >
            🚌 Nearby Bus Stop in Google Maps
          </button>
          {nearestInfo && <span className="text-xs text-white/40 self-center">Nearest: {nearestInfo}</span>}
        </div>

        {/* Inputs */}
        <div className="grid md:grid-cols-2 gap-3 mt-4">
          <div className="relative">
            <label className="text-xs text-[#FFD60A]/70">Start</label>
            <input value={start} onChange={e => setStart(e.target.value)} onFocus={() => setShowStart(true)} onBlur={() => setTimeout(() => setShowStart(false), 180)} placeholder="Chetla Agrani Club, Tollygunge, Sealdah, South City Mall…" className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[#020617]/60 border border-[#FFD60A]/10 outline-none text-sm text-white placeholder:text-white/30 focus:border-[#FFD60A]/30" />
            {showStart && filteredStart.length > 0 && (
              <ul className="absolute z-20 mt-1 w-full max-h-44 overflow-y-auto rounded-xl bg-[#0B1220] border border-[#FFD60A]/10 shadow-lg">
                {filteredStart.map(s => (
                  <li key={s}><button onMouseDown={e => { e.preventDefault(); setStart(s); setShowStart(false) }} className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-[#FFD60A]/10 hover:text-[#FFD60A]">{s}</button></li>
                ))}
              </ul>
            )}
          </div>
          <div className="relative">
            <label className="text-xs text-[#FFD60A]/70">Destination</label>
            <input value={dest} onChange={e => setDest(e.target.value)} onFocus={() => setShowDest(true)} onBlur={() => setTimeout(() => setShowDest(false), 180)} placeholder="Ahiritala Sarbojanin, Shyambazar, Esplanade…" className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[#020617]/60 border border-[#FFD60A]/10 outline-none text-sm text-white placeholder:text-white/30 focus:border-[#FFD60A]/30" />
            {showDest && filteredDest.length > 0 && (
              <ul className="absolute z-20 mt-1 w-full max-h-44 overflow-y-auto rounded-xl bg-[#0B1220] border border-[#FFD60A]/10 shadow-lg">
                {filteredDest.map(s => (
                  <li key={s}><button onMouseDown={e => { e.preventDefault(); setDest(s); setShowDest(false) }} className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-[#FFD60A]/10 hover:text-[#FFD60A]">{s}</button></li>
                ))}
              </ul>
            )}
          </div>
        </div>

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
          {result?.error && <p className="text-sm text-red-400">Unknown stop — tried {result.resolvedFrom ? `${result.resolvedFrom.start} → ${result.resolvedFrom.dest}` : ''} (from {result.origin} → {result.dest}). Try bus stop names like Esplanade, Sealdah, Tollygunge, Sovabazar or pandal names auto-mapped.</p>}
          {plans.map((pl: any, i: number) => (
            <div key={i} className="p-3 md:p-4 rounded-2xl glass border border-[#FFD60A]/10">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#FFD60A]">{pl.kind === 'mixed' ? 'Bus + Train' : pl.kind === 'metro' ? 'Train/Metro only' : 'Bus only'} • {pl.legs.length} leg{pl.legs.length>1?'s':''}</span>
                <span className="text-xs text-white/40 whitespace-nowrap">⏱ {pl.timeMin} min • ₹{pl.fare}</span>
              </div>
              <div className="mt-2 space-y-2.5">
                {pl.legs.map((leg: any, j: number) => (
                  <div key={j} className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 text-sm bg-[#020617]/30 md:bg-transparent rounded-xl md:rounded-none p-2.5 md:p-0 border border-[#FFD60A]/5 md:border-0">
                    <span className={`self-start md:self-auto shrink-0 px-2.5 py-1 rounded-full text-xs font-bold leading-none text-center min-w-[72px] ${leg.kind==='metro'?'bg-[#FFD60A] text-[#020617]':'bg-[#0B1220] border border-[#FFD60A]/20 text-[#FFD60A]'}`}>{leg.route}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium leading-tight truncate">{leg.from} <span className="text-[#FFD60A]/60">→</span> {leg.to}</p>
                      <p className="text-[11px] text-white/35 leading-tight mt-0.5 md:mt-0">{leg.stops.length-1} stops{leg.towards ? ` • towards ${leg.towards}`:''}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] md:text-[11px] text-white/20 mt-2 leading-tight">Route engine picks best of bus-only vs train-only vs bus+train for this toggle.</p>
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
