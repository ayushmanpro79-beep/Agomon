'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import PandalMap from '@/components/map/PandalMap'
import PandalCard from '@/components/pandal/PandalCard'
import { FadeUp, PageTransition } from '@/components/ui/Animated'
import Link from 'next/link'

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

// src/app/map/page.tsx:25 - OSM map + not-crowded cards (horizontal scroll, 1 card per row on mobile)
export default function MapPage() {
  const [pandals, setPandals] = useState<Pandal[]>([])
  const [filter, setFilter] = useState('All')
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      let q = supabase.from('pandals').select('*').order('name')
      if (filter !== 'All') q = q.eq('area', filter)
      const { data } = await q
      setPandals((data as Pandal[]) || [])
    }
    load()
  }, [filter])

  const visible = selected ? pandals.filter((p) => p.slug === selected) : pandals.slice(0, 8) // limit to 8 to avoid dense feel

  return (
    <PageTransition>
      <FadeUp>
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-bold text-[#FFD60A]">Map</h1>
          <Link href="/" className="text-xs bg-[#FFD60A] text-[#0F172A] px-3 py-1.5 rounded-full font-semibold">Welcome</Link>
        </div>
      </FadeUp>
      <div className="flex justify-center gap-3 mb-3 opacity-80">
        <span className="w-6 h-7 flex flex-col items-center"><span className="w-1.5 h-3 bg-orange-500 rounded-full animate-pulse"/><span className="w-3 h-1 bg-amber-900 rounded-full -mt-0.5"/></span>
        <span className="w-6 h-7 flex flex-col items-center"><span className="w-1.5 h-3 bg-orange-500 rounded-full animate-pulse" style={{animationDelay:'150ms'}}/><span className="w-3 h-1 bg-amber-900 rounded-full -mt-0.5"/></span>
        <span className="w-6 h-7 flex flex-col items-center"><span className="w-1.5 h-3 bg-orange-500 rounded-full animate-pulse" style={{animationDelay:'300ms'}}/><span className="w-3 h-1 bg-amber-900 rounded-full -mt-0.5"/></span>
      </div>

      <FadeUp delay={80}>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-3">
          {AREAS.map((a) => (
            <button key={a} onClick={() => { setFilter(a); setSelected(null) }} className={`whitespace-nowrap px-3 py-1 rounded-full text-xs border ${filter === a ? 'bg-amber-900 text-white border-amber-900' : 'bg-white text-zinc-600 border-amber-100'}`}>
              {a}
            </button>
          ))}
        </div>
      </FadeUp>

      <FadeUp delay={120}>
        <div className="rounded-2xl overflow-hidden border border-[#FFD60A]/20">
          <PandalMap pandals={pandals} onSelect={(slug) => setSelected(slug)} />
        </div>
        <p className="text-xs text-white/40 mt-2 text-center">🪔 Tap a pin to filter — showing {visible.length} of {pandals.length} • OSM • Navy theme</p>
      </FadeUp>

      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-sm text-[#FFD60A]">{selected ? 'Selected Pandal' : `Nearby Pandals • ${filter}`}</h2>
          {selected && <button onClick={() => setSelected(null)} className="text-xs text-[#FFD60A] underline">Show all</button>}
        </div>

        {/* Not crowded: horizontal scroll on mobile, grid on desktop, max 8 cards */}
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-3 snap-x md:grid md:grid-cols-3 md:overflow-visible">
          {visible.map((p) => (
            <div key={p.id} className="min-w-[160px] w-[160px] md:w-auto snap-start">
              <PandalCard pandal={p} />
            </div>
          ))}
        </div>
        {!selected && pandals.length > 8 && (
          <p className="text-xs text-zinc-400 text-center mt-1">Showing 8 of {pandals.length} — use filter or tap map pin to narrow</p>
        )}
      </div>
    </PageTransition>
  )
}
