'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import PandalCard from '@/components/pandal/PandalCard'
import { FadeUp, StaggerList, PageTransition } from '@/components/ui/Animated'
import DurgaEyes from '@/components/animations/DurgaEyes'
import { DeepakRow } from '@/components/animations/Deepak'

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

// src/app/page.tsx:22 - welcome screen navy/yellow + Durga eyes opening + deepaks + browse maps
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
      {/* Welcome hero - cropped appropriately pc/phone */}
      <FadeUp>
        <div className="rounded-3xl overflow-hidden border border-[#FFD60A]/20 bg-gradient-to-b from-[#1E293B] to-[#0F172A] p-6 md:p-10 text-center">
          {/* mobile vs pc crop via max-width */}
          <p className="text-[#FFD60A] tracking-[0.3em] text-xs">শুভ শারদীয়া</p>
          <h1 className="text-2xl md:text-4xl font-bold text-white mt-1">আগমন — AGOMON</h1>
          <p className="text-[#FFD60A]/70 text-sm mt-1">Kolkata&apos;s 45 Popular Pujas</p>
          <div className="mt-6">
            <DurgaEyes />
          </div>
          <p className="text-xs text-white/50 mt-3">Eyes open as Ma arrives • Deepaks illuminate the path</p>
          <div className="mt-5">
            <DeepakRow count={5} />
          </div>
        </div>
      </FadeUp>

      {/* Browse maps - decorated with deepak assets */}
      <FadeUp delay={200}>
        <div className="mt-6 rounded-2xl bg-[#FFD60A] p-4 flex items-center justify-between border-2 border-[#FFD60A] shadow-[0_0_20px_rgba(255,214,10,0.3)]">
          <div>
            <h2 className="font-bold text-[#0F172A]">Browse Maps</h2>
            <p className="text-xs text-[#0F172A]/70">45 pandals on OpenStreetMap</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex gap-2 mr-2">
              <span className="w-6 h-8 flex flex-col items-center"><span className="w-2 h-4 bg-orange-600 rounded-full animate-pulse" /><span className="w-4 h-1.5 bg-amber-900 rounded-full -mt-1" /></span>
              <span className="w-6 h-8 flex flex-col items-center"><span className="w-2 h-4 bg-orange-600 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} /><span className="w-4 h-1.5 bg-amber-900 rounded-full -mt-1" /></span>
            </div>
            <a href="/map" className="bg-[#0F172A] text-[#FFD60A] px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#1E293B] transition">Open Map 🪔</a>
          </div>
        </div>
      </FadeUp>

      <FadeUp delay={280}>
        <div className="bg-white rounded-2xl p-3 border border-[#FFD60A]/20 shadow-sm flex gap-2 mt-4">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">⌕</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Pandals, Areas..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-amber-50/80 border border-amber-100 outline-none text-sm text-zinc-900 focus:bg-white focus:border-[#FFD60A] transition"
            />
          </div>
        </div>
      </FadeUp>

      <FadeUp delay={320}>
        <div className="flex gap-2 mt-4 overflow-x-auto scrollbar-hide pb-2">
          {AREAS.map((a) => (
            <button
              key={a}
              onClick={() => setArea(a)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium border transition ${area === a ? 'bg-[#FFD60A] text-[#0F172A] border-[#FFD60A]' : 'bg-white text-[#0F172A] border-[#FFD60A]/30 hover:bg-[#FFF8E1]'}`}
            >
              {a}
            </button>
          ))}
        </div>
      </FadeUp>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-[#FFD60A]">{area === 'All' ? 'All Pandals' : area} <span className="text-white/40 font-normal text-sm">• {pandals.length}</span></h2>
          <span className="text-xs text-white/40">{loading ? 'Searching...' : `${pandals.length} found`}</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 bg-white/10 rounded-2xl border border-[#FFD60A]/10 animate-pulse" />
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
          <div className="text-center py-12 text-white/50 text-sm">No pandals found for &quot;{query}&quot;</div>
        )}
      </div>
    </PageTransition>
  )
}
