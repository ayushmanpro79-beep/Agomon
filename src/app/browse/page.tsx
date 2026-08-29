'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import PandalMap from '@/components/map/PandalMap'
import PandalCard from '@/components/pandal/PandalCard'
import { FadeUp, PageTransition } from '@/components/ui/Animated'
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

const AREAS = ['All', 'North Kolkata', 'Dumdum', 'South Kolkata', 'West Kolkata & Behala', 'Central Kolkata', 'Salt Lake & Rajarhat']

// src/app/browse/page.tsx:25 - Browse page (renamed from Map): full map + pandal list + area→metro dropdown
export default function BrowsePage() {
  const router = useRouter()
  const [pandals, setPandals] = useState<Pandal[]>([])
  const [filter, setFilter] = useState('All')
  const [selectedMetro, setSelectedMetro] = useState<string>('All')
  const [showMetroDropdown, setShowMetroDropdown] = useState(false)

  useEffect(() => {
    const load = async () => {
      let q = supabase.from('pandals').select('*').order('name')
      if (filter !== 'All') q = q.eq('area', filter)
      const { data } = await q
      setPandals((data as Pandal[]) || [])
      setSelectedMetro('All')
      setShowMetroDropdown(false)
    }
    load()
  }, [filter])

  // metros relevant to current area (within 1km of any pandal in filtered list)
  const metrosForArea = useMemo(() => {
    if (filter === 'All') return []
    const withCoords = pandals.filter((p) => p.latitude && p.longitude) as (Pandal & { latitude: number; longitude: number })[]
    if (withCoords.length === 0) return []
    const scored = KOLKATA_METROS.map((m) => ({
      metro: m,
      count: withCoords.filter((p) => haversineKm({ lat: p.latitude, lon: p.longitude }, { lat: m.lat, lon: m.lon }) <= 1).length,
    }))
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count)
      .map((s) => s.metro)
    return scored
  }, [pandals, filter])

  const metrosToShow = useMemo(() => {
    if (selectedMetro === 'All') {
      // show up to 3 most shared for area, or empty for All
      if (filter === 'All') return []
      return metrosForArea.slice(0, 3).map((m) => ({ id: m.id, name: m.name, lat: m.lat, lon: m.lon }))
    }
    const m = KOLKATA_METROS.find((x) => x.id === selectedMetro)
    return m ? [{ id: m.id, name: m.name, lat: m.lat, lon: m.lon }] : []
  }, [metrosForArea, selectedMetro, filter])

  const filteredByMetro = useMemo(() => {
    if (selectedMetro === 'All') return pandals
    const m = KOLKATA_METROS.find((x) => x.id === selectedMetro)
    if (!m) return pandals
    return pandals.filter((p) => p.latitude && p.longitude && haversineKm({ lat: p.latitude, lon: p.longitude }, { lat: m.lat, lon: m.lon }) <= 1)
  }, [pandals, selectedMetro])

  const handleAreaClick = (a: string) => {
    setFilter(a)
    if (a !== 'All') setShowMetroDropdown(true)
    else setShowMetroDropdown(false)
  }

  return (
    <PageTransition>
      <FadeUp>
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-bold text-[#FFD60A]">Browse</h1>
          <Link href="/" className="text-xs bg-[#FFD60A] text-[#020617] px-3 py-1.5 rounded-full font-semibold">Welcome</Link>
        </div>
      </FadeUp>

      <FadeUp delay={80}>
        <div className="rounded-2xl overflow-hidden border border-[#FFD60A]/10">
          <PandalMap
            pandals={filteredByMetro}
            mode="browse"
            metrosToShow={metrosToShow}
            onPandalClick={(slug) => router.push(`/pandal/${slug}`)}
            onMetroClick={(id) => setSelectedMetro(id)}
          />
        </div>
        <p className="text-xs text-white/30 mt-2 text-center">Map shows Kolkata + {filteredByMetro.length} pandals • {metrosToShow.length} metros • OSM in-website</p>
      </FadeUp>

      <FadeUp delay={120}>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mt-4">
          {AREAS.map((a) => (
            <div key={a} className="relative">
              <button
                onClick={() => handleAreaClick(a)}
                className={`whitespace-nowrap px-3 py-1 rounded-full text-xs border flex items-center gap-1 ${filter === a ? 'bg-[#FFD60A] text-[#020617] border-[#FFD60A]' : 'bg-[#0B1220] text-[#FFD60A]/60 border-[#FFD60A]/10'}`}
              >
                {a} {a !== 'All' && metrosForArea.length > 0 && <span className="text-[10px]">{showMetroDropdown && filter === a ? '▴' : '▾'}</span>}
              </button>
              {a !== 'All' && showMetroDropdown && filter === a && (
                <div className="absolute top-8 left-0 z-20 bg-[#0B1220] border border-[#FFD60A]/20 rounded-xl shadow-xl min-w-[180px] overflow-hidden">
                  <button onClick={() => { setSelectedMetro('All'); setShowMetroDropdown(false) }} className={`w-full text-left px-3 py-2 text-xs hover:bg-[#FFD60A]/10 ${selectedMetro === 'All' ? 'bg-[#FFD60A]/20 text-[#FFD60A] font-semibold' : 'text-white/80'}`}>* All — {pandals.length} pandals</button>
                  {metrosForArea.map((m) => {
                    const cnt = pandals.filter((p) => p.latitude && p.longitude && haversineKm({ lat: p.latitude, lon: p.longitude }, { lat: m.lat, lon: m.lon }) <= 1).length
                    return (
                      <button key={m.id} onClick={() => { setSelectedMetro(m.id); setShowMetroDropdown(false) }} className={`w-full text-left px-3 py-2 text-xs hover:bg-[#FFD60A]/10 flex justify-between ${selectedMetro === m.id ? 'bg-[#FFD60A]/20 text-[#FFD60A] font-semibold' : 'text-white/80'}`}>
                        <span>* {m.name}</span><span className="text-white/30 text-[11px]">{cnt}</span>
                      </button>
                    )
                  })}
                  {metrosForArea.length === 0 && <p className="px-3 py-2 text-xs text-white/30">No metro within 1km</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      </FadeUp>

      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-sm text-[#FFD60A]">
            {selectedMetro !== 'All' ? `Near ${KOLKATA_METROS.find((m) => m.id === selectedMetro)?.name} (1km)` : `All Pandals • ${filter}`} <span className="text-white/30 font-normal">• {filteredByMetro.length}</span>
          </h2>
          {selectedMetro !== 'All' && <button onClick={() => setSelectedMetro('All')} className="text-xs text-[#FFD60A] underline">Show all</button>}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filteredByMetro.map((p) => (
            <PandalCard key={p.id} pandal={p} />
          ))}
        </div>
        {filteredByMetro.length === 0 && <p className="text-xs text-white/30 text-center py-10">No pandals near this metro (1km)</p>}
      </div>
    </PageTransition>
  )
}
