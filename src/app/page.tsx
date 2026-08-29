'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import PandalCard from '@/components/pandal/PandalCard'
import { FadeUp, StaggerList, PageTransition } from '@/components/ui/Animated'
import DurgaEyes from '@/components/animations/DurgaEyes'
import { CornerDeepaks } from '@/components/animations/Deepak'

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

// src/app/page.tsx:22 - darker minimal welcome, corners deepaks yellow only, browse at bottom, dark cards
export default function Home() {
  const [pandals, setPandals] = useState<Pandal[]>([])
  const [query, setQuery] = useState('')
  const [area, setArea] = useState('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      let q = supabase.from('pandals').select('*').order('name')
      if (query) q = q.ilike('name', `%${query}%`)
      if (area !== 'All') q = q.eq('area', area)
      const { data } = await q
      setPandals((data as Pandal[]) || [])
      setLoading(false)
    }
    const t = setTimeout(fetchData, 300)
    return () => clearTimeout(t)
  }, [query, area])

  return (
    <PageTransition>
      {/* Welcome - darker minimal, corners deepaks */}
      <FadeUp>
        <div className="relative rounded-3xl overflow-hidden border border-[#FFD60A]/10 bg-[#0B1220] p-6 md:p-10 text-center min-h-[340px] flex flex-col justify-between">
          <CornerDeepaks />
          <div>
            <p className="text-[#FFD60A]/60 tracking-[0.3em] text-[10px]">শুভ শারদীয়া</p>
            <h1 className="text-2xl md:text-4xl font-bold text-white mt-1 tracking-tight">আগমন — AGOMON</h1>
            <p className="text-[#FFD60A]/50 text-xs mt-1">45 Popular Pujas of Kolkata</p>
          </div>
          <div className="py-4">
            <DurgaEyes />
            <p className="text-[11px] text-white/30 mt-3">eyes appear closed → slowly open</p>
          </div>
          <div>
            <a href="#browse" className="inline-block bg-[#FFD60A] text-[#020617] px-8 py-2.5 rounded-full text-sm font-semibold hover:bg-[#FFE566] transition">Browse Pandals 🪔</a>
            <p className="text-[10px] text-white/20 mt-2">OSM dark map • Yellow only</p>
          </div>
        </div>
      </FadeUp>

      <div id="browse" className="scroll-mt-4" />

      <FadeUp delay={200}>
        <div className="bg-[#0B1220] rounded-2xl p-3 border border-[#FFD60A]/10 flex gap-2 mt-4">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FFD60A]/40 text-sm">⌕</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Pandals, Areas..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#020617] border border-[#FFD60A]/10 outline-none text-sm text-white placeholder:text-white/30 focus:border-[#FFD60A]/30 transition"
            />
          </div>
        </div>
      </FadeUp>

      <FadeUp delay={260}>
        <div className="flex gap-2 mt-4 overflow-x-auto scrollbar-hide pb-2">
          {AREAS.map((a) => (
            <button
              key={a}
              onClick={() => setArea(a)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium border transition ${area === a ? 'bg-[#FFD60A] text-[#020617] border-[#FFD60A]' : 'bg-[#0B1220] text-[#FFD60A]/70 border-[#FFD60A]/10 hover:border-[#FFD60A]/30'}`}
            >
              {a}
            </button>
          ))}
        </div>
      </FadeUp>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-[#FFD60A] text-sm">{area === 'All' ? 'All Pandals' : area} <span className="text-white/20 font-normal">• {pandals.length}</span></h2>
          <span className="text-xs text-white/20">{loading ? '...' : `${pandals.length} found`}</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 bg-[#0B1220] rounded-2xl border border-[#FFD60A]/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <StaggerList className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {pandals.map((p) => (
              <PandalCard key={p.id} pandal={p} />
            ))}
          </StaggerList>
        )}

        {!loading && pandals.length === 0 && (
          <div className="text-center py-12 text-white/30 text-sm">No pandals found</div>
        )}
      </div>
    </PageTransition>
  )
}
