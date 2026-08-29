'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { FadeUp, PageTransition, PressButton } from '@/components/ui/Animated'

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

// src/app/pandal/[slug]/page.tsx:15 - detail with image placeholder, rating, no auth
export default function PandalDetail() {
  const { slug } = useParams<{ slug: string }>()
  const [pandal, setPandal] = useState<Pandal | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('pandals').select('*').eq('slug', slug).single().then(({ data }) => {
      setPandal(data as Pandal)
      setLoading(false)
    })
  }, [slug])

  if (loading) return <div className="py-20 text-center text-zinc-400 text-sm">Loading pandal...</div>
  if (!pandal) return <div className="py-20 text-center"><p className="text-zinc-500">Pandal not found</p><Link href="/" className="text-amber-700 underline text-sm">Back to search</Link></div>

  const rating = pandal.avg_rating ?? 4.5
  const hasImage = !!pandal.image_url

  return (
    <PageTransition>
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-zinc-500 mb-3">← Back</Link>

      <FadeUp>
        <div className="bg-white rounded-2xl overflow-hidden border border-amber-100 shadow-sm">
          <div className="h-64 bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center relative">
            {hasImage ? (
              <img src={pandal.image_url!} alt={pandal.name} className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-6">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-white flex items-center justify-center text-2xl shadow-sm">🪔</div>
                <p className="text-sm text-amber-800/70 mt-3 font-medium">{pandal.name}</p>
                <p className="text-xs text-amber-700/40 mt-1">Image field ready — upload later</p>
                <p className="text-[11px] text-zinc-400 mt-2 font-mono">{pandal.slug}</p>
              </div>
            )}
            <span className="absolute top-3 left-3 text-xs bg-white/90 px-2.5 py-1 rounded-full border">{pandal.area}</span>
          </div>

          <div className="p-4">
            <h1 className="text-xl font-bold text-zinc-900">{pandal.name}</h1>
            <p className="text-sm text-zinc-500 mt-1">{pandal.address || pandal.area + ', Kolkata'}</p>

            <div className="flex items-center gap-3 mt-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-900">{rating.toFixed(1)}</p>
                <p className="text-[10px] text-zinc-500">Avg Rating</p>
              </div>
              <div className="flex-1 border-l border-amber-200 pl-3">
                <div className="flex text-amber-500 text-sm">{'★'.repeat(Math.round(rating))}<span className="text-zinc-300">{'★'.repeat(5 - Math.round(rating))}</span><span className="ml-2 text-xs text-zinc-600">{rating.toFixed(1)} / 5</span></div>
                <p className="text-xs text-zinc-500 mt-1">{pandal.rating_count ?? 0} ratings • Viewers</p>
              </div>
            </div>

            {pandal.latitude && (
              <div className="mt-4 flex gap-2">
                <PressButton className="flex-1 bg-amber-900 text-white rounded-xl py-2.5 text-sm font-medium" onClick={() => window.open(`https://www.openstreetmap.org/?mlat=${pandal.latitude}&mlon=${pandal.longitude}#map=17/${pandal.latitude}/${pandal.longitude}`, '_blank')}>
                  View on OSM
                </PressButton>
                <PressButton className="flex-1 bg-white border border-amber-200 text-amber-900 rounded-xl py-2.5 text-sm font-medium" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${pandal.latitude},${pandal.longitude}`, '_blank')}>
                  Directions
                </PressButton>
              </div>
            )}

            <div className="mt-4 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
              <p className="text-xs font-semibold text-zinc-700">About</p>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">One of the 45 Popular Pujas of Kolkata. Add description and real pandal image via <code className="bg-white px-1 py-0.5 rounded border text-[11px]">image_url</code> field in Supabase — no code change needed.</p>
            </div>
          </div>
        </div>
      </FadeUp>
    </PageTransition>
  )
}
