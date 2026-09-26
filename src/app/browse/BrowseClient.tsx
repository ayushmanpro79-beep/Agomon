'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
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
  const filterRowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (initialPandals && initialPandals.length) return
    const load = async () => {
      const { data } = await supabase.from('pandals').select('*').order('name')
      setAllPandals((data as Pandal[]) || [])
    }
    load()
  }, [initialPandals])

  // Deep-link: /browse?area=South%20Kolkata preselects the filter (ticker + detail "More in area")
  useEffect(() => {
    try {
      const area = new URLSearchParams(window.location.search).get('area')
      if (area && AREAS.includes(area)) {
        setFilter(area)
        if (area !== 'All') setShowMetroDropdown(true)
      }
    } catch {}
  }, [])

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
  }, [filter])

  // keep active filter button visible in scroll row (mobile)
  useEffect(() => {
    if (!filterRowRef.current) return
    const el = filterRowRef.current.querySelector(`[data-filter="${filter}"]`) as HTMLElement | null
    if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
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

  const handleAreaClick = (a: string, e?: React.MouseEvent<HTMLButtonElement>) => {
    // yellow pop on every tap/click — force reflow if same element to retrigger filter-pop
    if (e?.currentTarget) {
      const btn = e.currentTarget
      btn.classList.remove('filter-pop')
      void btn.offsetWidth
      btn.classList.add('filter-pop')
      // quick tap feedback
      btn.animate?.(
        [{ transform: 'scale(1)' }, { transform: 'scale(0.96)' }, { transform: 'scale(1.04)' }, { transform: 'scale(1)' }],
        { duration: 260, easing: 'cubic-bezier(0.34,1.56,0.64,1)' }
      )
    }
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
    // only tapping the arrow on active pill toggles the metro menu — blank taps / hover do not close (mobile + desktop)
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 mb-3">
          <div className="flex items-center gap-2.5">
            <h1 className="font-bold text-white text-base md:text-lg leading-tight tracking-tight">Browse pandals</h1>
            <span className="chip-minimal px-2.5 py-1 text-[#FFD60A]">{filteredBySearch.length || allPandals.length} live</span>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button onClick={refresh} disabled={refreshing} className="btn-ghost text-xs px-3.5 py-2 disabled:opacity-50">
              {refreshing ? 'Refreshing…' : '↻ Refresh'}
            </button>
            <Link href="/" className="btn-primary text-xs px-3.5 py-2">Welcome</Link>
          </div>
        </div>
        <p className="text-[11px] text-white/35">Explore Various Pandals in Kolkata • OSM map • Metro nearby</p>
        {lastRefreshed && <p className="text-[11px] text-white/30 mt-1">Updated {lastRefreshed} • {allPandals.length} pandals loaded</p>}
        {refreshErr && <p className="text-[11px] text-red-400 mt-1">{refreshErr}</p>}
      </FadeUp>

      <FadeUp delay={80}>
        <SectionBorder />
        <div className="glass rounded-[20px] overflow-hidden p-1 ring-1 ring-[#FFD60A]/10">
            <PandalMap
              pandals={filteredBySearch}
              mode="browse"
              metrosToShow={metrosToShow}
              onPandalClick={(slug) => router.push(`/pandal/${slug}`)}
              onMetroClick={(id) => setSelectedMetro(id)}
            />
          </div>
        <SectionBorder className="mt-2 rotate-180" />
        <p className="text-[11px] text-white/30 mt-2 text-center">{filteredBySearch.length} pandals • {metrosToShow.length} metros • OSM in-website</p>
      </FadeUp>

      <FadeUp delay={100}>
        <SectionBorder />
        <div className="glass rounded-2xl p-2.5 mt-4">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#FFD60A]/40 text-[15px]">⌕</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pandal, metro, area — try “chetla”, “Sealdah”…"
              className="input-minimal pl-10 pr-10 py-3 text-sm"
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white/5 text-white/50 hover:text-[#FFD60A] hover:bg-[#FFD60A]/10 text-xs transition">✕</button>
            )}
          </div>
          {searchMeta && <p className="text-[11px] text-[#FFD60A]/70 mt-2">{searchMeta} {accuracy && <span className="text-white/40">• {accuracy}% match</span>}</p>}
          {accuracy && (
            <div className="mt-1.5 h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[#FFD60A] rounded-full transition-all duration-500" style={{ width: `${accuracy}%` }} />
            </div>
          )}
        </div>
        <SectionBorder className="mt-2 rotate-180" />
      </FadeUp>

      <FadeUp delay={120}>
        {/* filter row — dropdown only toggled via pill arrow (no blank tap / hover close) */}
        <div className="relative">
          <div ref={filterRowRef} key={filter} className="flex gap-2.5 overflow-x-auto scrollbar-hide filter-scroll pb-3 mt-4 px-1 -mx-1 snap-x snap-mandatory">
            {AREAS.map((a) => (
              <button
                key={a}
                data-filter={a}
                aria-pressed={filter === a}
                onClick={(e) => handleAreaClick(a, e)}
                onMouseEnter={(e) => {
                  // subtle yellow preview on hover before click (desktop)
                  if (filter !== a) {
                    e.currentTarget.style.borderColor = 'rgba(255,214,10,0.35)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (filter !== a) e.currentTarget.style.borderColor = ''
                }}
                className={`whitespace-nowrap shrink-0 snap-start min-h-[38px] md:min-h-[34px] px-4 py-2 rounded-full text-[13px] md:text-xs font-semibold border flex items-center gap-1.5 filter-btn select-none ${
                  filter === a
                    ? 'bg-[#FFD60A] text-[#020617] border-[#FFD60A] shadow-[0_0_18px_rgba(255,214,10,0.32)] filter-btn-selected filter-pop'
                    : 'glass text-[#FFD60A]/75 border-[#FFD60A]/15 hover:text-[#FFD60A] hover:border-[#FFD60A]/40'
                }`}
              >
                {a === 'Nearby me' ? (<><span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden /> Nearby me</>) : a} {a !== 'All' && a !== 'Nearby me' && filter === a && metrosForArea.length > 0 && <span className="text-[11px] leading-none ml-0.5">{metroMenuOpen ? '▴' : '▾'}</span>}
              </button>
            ))}
          </div>
          {nearbyErr && filter === 'Nearby me' && <p className="text-[11px] text-red-400 mt-1">{nearbyErr}</p>}
          {filter === 'Nearby me' && !nearbyLoc && !nearbyErr && <p className="text-[11px] text-white/30 mt-1">Getting your location…</p>}
          {filter === 'Nearby me' && nearbyLoc && <p className="text-[11px] text-[#FFD60A]/60 mt-1">{pandals.length} pandals within 3 km of you</p>}
          {/* metro dropdown — height-animated wrapper (pushes cards); only pill arrow toggles, metro select keeps open */}
          <div className={`metro-collapse-wrapper ${metroMenuOpen ? 'open' : ''}`} aria-hidden={!metroMenuOpen}>
            <div className="metro-collapse-inner">
              <div
                key={`metro-${filter}`}
                role="listbox"
                aria-label="Metro filter"
                className={`mt-3 glass-strong metro-dropdown rounded-2xl overflow-hidden border border-[#FFD60A]/15 w-full md:w-[min(560px,92vw)] max-h-[52vh] overflow-y-auto shadow-[0_16px_48px_rgba(0,0,0,0.55)] ${metroMenuOpen ? 'metro-drop-in' : 'metro-drop-out'}`}
              >
                <button
                  role="option"
                  aria-selected={selectedMetro === 'All'}
                  onClick={() => setSelectedMetro('All')}
                  className={`w-full text-left px-4 py-3 text-[13px] md:text-xs flex justify-between items-center transition-all hover:bg-[#FFD60A]/10 hover:pl-5 active:scale-[0.99] pc-btn metro-item ${selectedMetro === 'All' ? 'bg-[#FFD60A]/15 text-[#FFD60A] font-semibold pc-selected' : 'text-white/85'}`}
                  style={{ animationDelay: '0ms' }}
                >
                  <span className="flex items-center gap-2"><span className="text-[#FFD60A]">◆</span> All — {pandals.length} pandals</span><span className="text-white/25 text-xs">▸</span>
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border-t border-[#FFD60A]/10">
                  {metrosForArea.map((m, idx) => {
                    const cnt = pandals.filter((p) => p.latitude && p.longitude && haversineKm({ lat: p.latitude, lon: p.longitude }, { lat: m.lat, lon: m.lon }) <= 2.2).length
                    return (
                      <button
                        key={m.id}
                        role="option"
                        aria-selected={selectedMetro === m.id}
                        onClick={() => setSelectedMetro(m.id)}
                        className={`text-left px-4 py-3 text-[13px] md:text-xs flex justify-between items-center border-b border-[#FFD60A]/5 transition-all hover:bg-[#FFD60A]/10 hover:pl-5 active:scale-[0.98] pc-btn metro-item ${selectedMetro === m.id ? 'bg-[#FFD60A]/15 text-[#FFD60A] font-semibold pc-selected' : 'text-white/85'}`}
                        style={{ animationDelay: `${(idx + 1) * 35}ms` }}
                      >
                        <span className="flex items-center gap-2"><span className="text-white/20 text-[10px]">●</span> {m.name}</span><span className="text-white/30 text-[11px] font-mono bg-white/5 px-1.5 py-0.5 rounded-full">{cnt}</span>
                      </button>
                    )
                  })}
                </div>
                {metrosForArea.length === 0 && <p className="px-4 py-4 text-xs text-white/30 text-center">No metro within 2.2km of this area</p>}
              </div>
            </div>
          </div>
        </div>
      </FadeUp>

      <div className={`mt-4 pandal-shift ${metroMenuOpen ? 'shifted' : ''}`}>
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <h2 className="font-semibold text-sm text-white leading-tight truncate">
            {query ? (searchMeta || `“${query}”`) : selectedMetro !== 'All' ? `Near ${KOLKATA_METROS.find((m) => m.id === selectedMetro)?.name}` : filter === 'Nearby me' ? `Nearby • 3 km` : filter} <span className="text-white/30 font-normal tabular">• {filteredBySearch.length}</span>
          </h2>
          {(selectedMetro !== 'All' || query) && <button onClick={() => { setSelectedMetro('All'); setQuery('') }} className="chip-minimal px-3 py-1.5 text-[#FFD60A] hover:bg-[#FFD60A]/10 transition shrink-0">Clear ✕</button>}
        </div>

        {allPandals.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 md:gap-3" aria-label="Loading pandals">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass skeleton-card p-0">
                <div className="skeleton sk-img" />
                <div className="p-3 space-y-2">
                  <div className="skeleton sk-line w-3/4" />
                  <div className="skeleton sk-line w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div key={`${filter}-${selectedMetro}-${query}`} className="stagger grid grid-cols-2 md:grid-cols-3 gap-2.5 md:gap-3">
            {filteredBySearch.map((p, i) => (
              <div key={p.id} style={{ animationDelay: `${Math.min(i, 11) * 45}ms` }}>
                <PandalCard pandal={p} />
              </div>
            ))}
          </div>
        )}
        {allPandals.length > 0 && filteredBySearch.length === 0 && (
          <div className="glass rounded-2xl text-center py-10 px-6">
            <p className="text-2xl text-[#FFD60A]" aria-hidden>◆</p>
            <p className="text-sm text-white/60 mt-2">No pandals found{query ? ` for “${query}”` : ''}</p>
            <p className="text-xs text-white/30 mt-1">Try a metro, area or landmark instead.</p>
            <button onClick={() => { setSelectedMetro('All'); setQuery(''); setFilter('All') }} className="btn-ghost text-xs px-4 py-2 mt-4 min-h-[44px]">Reset filters</button>
          </div>
        )}
      </div>
    </PageTransition>
  )
}
