'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import PandalCard from '@/components/pandal/PandalCard'
import { FadeUp, StaggerList, PageTransition } from '@/components/ui/Animated'

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

// src/app/page.tsx:20 - tracker home, no auth, search pandals
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
      <FadeUp>
        <div className="text-center py-6">
          <h1 className="text-2xl font-bold text-amber-900">শুভ সকাল, কলকাতা!</h1>
          <p className="text-sm text-zinc-500">Good Morning! — Find your puja today</p>
        </div>
      </FadeUp>

      <FadeUp delay={100}>
        <div className="bg-white rounded-2xl p-3 border border-amber-100 shadow-sm flex gap-2">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">⌕</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Pandals, Areas..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-amber-50/50 border border-amber-100 outline-none text-sm focus:bg-white focus:border-amber-300 transition"
            />
          </div>
        </div>
      </FadeUp>

      <FadeUp delay={180}>
        <div className="flex gap-2 mt-4 overflow-x-auto scrollbar-hide pb-2">
          {AREAS.map((a) => (
            <button
              key={a}
              onClick={() => setArea(a)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium border transition ${area === a ? 'bg-amber-900 text-white border-amber-900' : 'bg-white text-zinc-600 border-amber-100 hover:bg-amber-50'}`}
            >
              {a}
            </button>
          ))}
        </div>
      </FadeUp>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-zinc-800">{area === 'All' ? 'All Pandals' : area} <span className="text-zinc-400 font-normal text-sm">• {pandals.length}</span></h2>
          <span className="text-xs text-zinc-400">{loading ? 'Searching...' : `${pandals.length} found`}</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 bg-white rounded-2xl border border-amber-100 animate-pulse" />
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
          <div className="text-center py-12 text-zinc-500 text-sm">No pandals found for &quot;{query}&quot;</div>
        )}
      </div>
    </PageTransition>
  )
}
