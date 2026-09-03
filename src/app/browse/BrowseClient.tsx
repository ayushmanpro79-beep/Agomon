'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import PandalMap from '@/components/map/PandalMap'
import PandalCard from '@/components/pandal/PandalCard'
import { FadeUp, PageTransition } from '@/components/ui/Animated'
import SectionBorder from '@/components/ui/SectionBorder'
import { haversineKm, KOLKATA_METROS } from '@/lib/geo'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Pandal = {
  id: string
  name: string
  slug: string
  area: string
  address: string | null
  latitude: number | null
  longitude: number | null
  image_url?: string | null
  avg_rating?: number | null
  rating_count?: number | null
}

const AREAS = ['All', 'Nearby me', 'North Kolkata', 'Dumdum', 'South Kolkata', 'West Kolkata & Behala', 'Central Kolkata', 'Salt Lake & Rajarhat']

export default function BrowseClient({ initialPandals }: { initialPandals?: Pandal[] }) {
  const router = useRouter()
  const [allPandals, setAllPandals] = useState<Pandal[]>(initialPandals || [])
  const [filter, setFilter] = useState('All')
  const [selectedMetro, setSelectedMetro] = useState<string>('All')
  const [showMetroDropdown, setShowMetroDropdown] = useState(false)

  useEffect(() => {
    if (initialPandals && initialPandals.length) return
    const load = async () => {
      const { data } = await supabase.from('pandals').select('*').order('name')
      setAllPandals((data as Pandal[]) || [])
    }
    load()
  }, [initialPandals])

  const [nearbyLoc, setNearbyLoc] = useState<{ lat: number; lon: number } | null>(null)
  const [nearbyErr, setNearbyErr] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [refreshErr, setRefreshErr] = useState('')
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null)

  const refresh = async () => {
    setRefreshing(true)
    setRefreshErr('')
    try {
      const { data, error } = await supabase.from('pandals').select('*').order('name')
      if (error) throw error
      setAllPandals((data as Pandal[]) || [])
      try {
        const { resetFuseCache } = await import('@/lib/searchEngine')
        resetFuseCache()
      } catch {}
      setLastRefreshed(new Date().toLocaleTimeString())
    } catch (e: any) {
      setRefreshErr(e?.message || 'Refresh failed')
    }
    setRefreshing(false)
  }

  const pandals = useMemo(() => {
    if (filter === 'All') return allPandals
    if (filter === 'Nearby me') {
      if (!nearbyLoc) return []
      return allPandals.filter(p => p.latitude && p.longitude && haversineKm({ lat: nearbyLoc.lat, lon: nearbyLoc.lon }, { lat: p.latitude!, lon: p.longitude! }) <= 3)
    }
    return allPandals.filter(p => p.area === filter)
  }, [allPandals, filter, nearbyLoc])

  useEffect(() => {
    setSelectedMetro('All')
    setShowMetroDropdown(false)
  }, [filter])

  const metrosForArea = useMemo(() => {
    if (filter === 'All') return []
    const withCoords = pandals.filter((p) => p.latitude && p.longitude) as (Pandal & { latitude: number; longitude: number })[]
    if (withCoords.length === 0) return []
    const scored = KOLKATA_METROS.map((m) => ({
      metro: m,
      count: withCoords.filter((p) => haversineKm({ lat: p.latitude, lon: p.longitude }, { lat: m.lat, lon: m.lon }) <= 2.2).length,
    }))
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count)
      .map((s) => s.metro)
    return scored
  }, [pandals, filter])

  const metrosToShow = useMemo(() => {
    if (selectedMetro === 'All') {
      if (filter === 'All') return []
      return metrosForArea.slice(0, 3).map((m) => ({ id: m.id, name: m.name, lat: m.lat, lon: m.lon }))
    }
    const m = KOLKATA_METROS.find((x) => x.id === selectedMetro)
    return m ? [{ id: m.id, name: m.name, lat: m.lat, lon: m.lon }] : []
  }, [metrosForArea, selectedMetro, filter])

  const [query, setQuery] = useState('')
  const [searchMeta, setSearchMeta] = useState('')
  const [accuracy, setAccuracy] = useState<number | null>(null)

  const filteredByMetro = useMemo(() => {
    if (selectedMetro === 'All') return pandals
    const m = KOLKATA_METROS.find((x) => x.id === selectedMetro)
    if (!m) return pandals
    return pandals.filter((p) => p.latitude && p.longitude && haversineKm({ lat: p.latitude, lon: p.longitude }, { lat: m.lat, lon: m.lon }) <= 2.2)
  }, [pandals, selectedMetro])

  const [filteredBySearch, setFilteredBySearch] = useState<Pandal[]>([])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!query.trim()) {
        setFilteredBySearch(filteredByMetro)
        setSearchMeta('')
        setAccuracy(null)
        return
      }
      const { searchEngine } = await import('@/lib/searchEngine')
      const res = await searchEngine(query, allPandals)
      if (!cancelled) {
        setFilteredBySearch(res.pandals)
        setSearchMeta(res.meta)
        setAccuracy(res.accuracy ?? null)
      }
    }
    const t = setTimeout(run, 300)
    return () => { cancelled = true; clearTimeout(t) }
  }, [query, filteredByMetro, allPandals])

  useEffect(() => {
    if (!query.trim()) setFilteredBySearch(filteredByMetro)
  }, [filteredByMetro, query])

  const handleAreaClick = (a: string) => {
    if (a === 'Nearby me') {
      setNearbyErr('')
      if (!navigator.geolocation) { setNearbyErr('Geolocation not supported'); return }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setNearbyLoc({ lat: pos.coords.latitude, lon: pos.coords.longitude })
          setFilter(a)
          setShowMetroDropdown(false)
        },
        () => setNearbyErr('Allow location to see nearby pandals'),
        { enableHighAccuracy: true, timeout: 8000 }
      )
      return
    }
    // tapping the active area toggles the metro menu (touch); hover opens it on desktop
    if (a === filter && a !== 'All') {
      setShowMetroDropdown((v) => !v)
      return
    }
    setFilter(a)
    if (a !== 'All') setShowMetroDropdown(true)
    else setShowMetroDropdown(false)
  }

  const metroMenuOpen = showMetroDropdown && filter !== 'All' && filter !== 'Nearby me'

  return (
    <PageTransition>
      <FadeUp>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
          <h1 className="font-bold text-[#FFD60A] text-sm md:text-base leading-tight">Browse — Explore Various Pandals in Kolkata</h1>
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button onClick={refresh} disabled={refreshing} className="text-xs bg-[#0B1220] border border-[#FFD60A]/20 text-[#FFD60A] px-3 py-1.5 rounded-full font-semibold disabled:opacity-50">
              {refreshing ? 'Refreshing…' : '↻ Refresh'}
            </button>
            <Link href="/" className="text-xs bg-[#FFD60A] text-[#020617] px-3 py-1.5 rounded-full font-semibold">Welcome</Link>
          </div>
        </div>
        {lastRefreshed && <p className="text-[11px] text-white/30 mb-2">Updated just now ({lastRefreshed}) • {allPandals.length} pandals loaded — new admin adds appear here</p>}
        {refreshErr && <p className="text-[11px] text-red-400 mb-2">{refreshErr}</p>}
      </FadeUp>

      <FadeUp delay={80}>
        <SectionBorder />
        <div className="glass rounded-2xl overflow-hidden p-1">
            <PandalMap
              pandals={filteredBySearch}
              mode="browse"
              metrosToShow={metrosToShow}
              onPandalClick={(slug) => router.push(`/pandal/${slug}`)}
              onMetroClick={(id) => setSelectedMetro(id)}
            />
          </div>
        <SectionBorder className="mt-2 rotate-180" />
        <p className="text-xs text-white/30 mt-2 text-center">Map shows Kolkata + {filteredBySearch.length} pandals • {metrosToShow.length} metros • OSM in-website</p>
      </FadeUp>

      <FadeUp delay={100}>
        <SectionBorder />
        <div className="glass rounded-2xl p-2.5 mt-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FFD60A]/40 text-sm">⌕</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search: golpark, chtla, Sealdah, south kolkata, tollygunge..."
              className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-[#020617]/60 backdrop-blur border border-[#FFD60A]/10 outline-none text-sm text-white placeholder:text-white/30 focus:border-[#FFD60A]/30 focus:bg-[#020617]/80 transition"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-[#FFD60A] text-sm">✕</button>
            )}
          </div>
          {searchMeta && <p className="text-[11px] text-[#FFD60A]/70 mt-2">{searchMeta} {accuracy && <span className="text-white/40">• {accuracy}% match</span>}</p>}
          {accuracy && (
            <div className="mt-1.5 h-1 w-full bg-[#020617] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#FF1A1A] via-[#FFD60A] to-[#22c55e]" style={{ width: `${accuracy}%` }} />
            </div>
          )}
        </div>
        <SectionBorder className="mt-2 rotate-180" />
      </FadeUp>

      <FadeUp delay={120}>
        {/* hover opens the metro menu on desktop, tap toggles it on touch */}
        <div
          onMouseEnter={() => { if (filter !== 'All' && filter !== 'Nearby me') setShowMetroDropdown(true) }}
          onMouseLeave={() => setShowMetroDropdown(false)}
        >
        <div key={filter} className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mt-4">
          {AREAS.map((a) => (
            <button
              key={a}
              onClick={() => handleAreaClick(a)}
              className={`whitespace-nowrap px-3 py-1 rounded-full text-xs border flex items-center gap-1 transition-all active:scale-95 ${filter === a ? 'bg-[#FFD60A] text-[#020617] border-[#FFD60A] pc-selected filter-pop' : 'glass text-[#FFD60A]/70 border-[#FFD60A]/10 hover:border-[#FFD60A]/30 hover:scale-[1.04] hover:text-[#FFD60A]'}`}
            >
              {a === 'Nearby me' ? '📍 Nearby me' : a} {a !== 'All' && a !== 'Nearby me' && filter === a && metrosForArea.length > 0 && <span className="text-[10px]">{metroMenuOpen ? '▴' : '▾'}</span>}
            </button>
          ))}
        </div>
        {nearbyErr && filter === 'Nearby me' && <p className="text-[11px] text-red-400 mt-2">{nearbyErr}</p>}
        {filter === 'Nearby me' && !nearbyLoc && !nearbyErr && <p className="text-[11px] text-white/30 mt-2">Getting your location…</p>}
        {filter === 'Nearby me' && nearbyLoc && <p className="text-[11px] text-[#FFD60A]/60 mt-2">{pandals.length} pandals within 3 km of you</p>}
        {metroMenuOpen && (
          <div key={`metro-${filter}-${selectedMetro}`} className="mt-2 glass-strong rounded-xl overflow-hidden metro-drop-in border border-[#FFD60A]/15 shadow-[0_8px_30px_rgba(0,0,0,0.45)]">
            <button onClick={() => { setSelectedMetro('All'); setShowMetroDropdown(false) }} className={`w-full text-left px-3 py-2.5 text-xs hover:bg-[#FFD60A]/10 hover:pl-4 flex justify-between transition-all pc-btn ${selectedMetro === 'All' ? 'bg-[#FFD60A]/15 text-[#FFD60A] font-semibold pc-selected' : 'text-white/80'}`}>
              <span>* All — {pandals.length} pandals</span><span className="text-white/30">▸</span>
            </button>
            <div className="grid grid-cols-2 gap-0 border-t border-[#FFD60A]/10">
              {metrosForArea.map((m) => {
                const cnt = pandals.filter((p) => p.latitude && p.longitude && haversineKm({ lat: p.latitude, lon: p.longitude }, { lat: m.lat, lon: m.lon }) <= 2.2).length
                return (
                  <button key={m.id} onClick={() => { setSelectedMetro(m.id); setShowMetroDropdown(false) }} className={`text-left px-3 py-2.5 text-xs hover:bg-[#FFD60A]/10 hover:pl-4 flex justify-between border-b border-[#FFD60A]/5 transition-all pc-btn ${selectedMetro === m.id ? 'bg-[#FFD60A]/15 text-[#FFD60A] font-semibold pc-selected' : 'text-white/80'}`}>
                    <span>* {m.name}</span><span className="text-white/30 text-[11px]">{cnt}</span>
                  </button>
                )
              })}
            </div>
            {metrosForArea.length === 0 && <p className="px-3 py-3 text-xs text-white/30">No metro within 2.2km of this area</p>}
          </div>
        )}
        </div>
      </FadeUp>

      <div className="mt-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 mb-2">
          <h2 className="font-semibold text-sm text-[#FFD60A] leading-tight break-words">
            {query ? (searchMeta || `Search: "${query}"`) : selectedMetro !== 'All' ? `Near ${KOLKATA_METROS.find((m) => m.id === selectedMetro)?.name} (2.2km)` : filter === 'Nearby me' ? `Nearby me • 3 km` : `All Pandals • ${filter}`} <span className="text-white/30 font-normal">• {filteredBySearch.length}</span>
          </h2>
          {(selectedMetro !== 'All' || query) && <button onClick={() => { setSelectedMetro('All'); setQuery('') }} className="text-xs text-[#FFD60A] underline self-start md:self-auto">Clear</button>}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
          {filteredBySearch.map((p) => (
            <PandalCard key={p.id} pandal={p} />
          ))}
        </div>
        {filteredBySearch.length === 0 && <p className="text-xs text-white/30 text-center py-10">No pandals found{query ? ` for "${query}"` : ''}</p>}
      </div>
    </PageTransition>
  )
}
