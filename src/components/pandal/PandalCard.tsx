'use client'
import Link from 'next/link'
import { PressButton } from '@/components/ui/Animated'

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

// src/components/pandal/PandalCard.tsx:15 - not dense, shows image placeholder + name + rating
export default function PandalCard({ pandal }: { pandal: Pandal }) {
  const rating = pandal.avg_rating ?? 4.5
  const count = pandal.rating_count ?? 0
  const hasImage = !!pandal.image_url

  return (
    <Link href={`/pandal/${pandal.slug}`} className="block">
      <PressButton className="w-full text-left">
        <div className="bg-white rounded-2xl overflow-hidden border border-amber-100 shadow-sm hover:shadow-md transition-shadow">
          {/* Image field - empty placeholder you will fill later */}
          <div className="h-36 bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center relative overflow-hidden">
            {hasImage ? (
              <img src={pandal.image_url!} alt={pandal.name} className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-4">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-white/80 flex items-center justify-center text-lg">🪔</div>
                <p className="text-xs text-amber-800/60">Image coming soon</p>
                <p className="text-[10px] text-amber-700/40 mt-1">{pandal.slug}</p>
              </div>
            )}
            <span className="absolute top-2 left-2 text-[10px] bg-white/90 px-2 py-1 rounded-full border text-amber-900">
              {pandal.area}
            </span>
          </div>
          <div className="p-3">
            <h3 className="font-semibold text-sm text-zinc-900 leading-tight line-clamp-1">{pandal.name}</h3>
            <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{pandal.address || pandal.area + ', Kolkata'}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="flex text-amber-500 text-xs">
                {'★'.repeat(Math.round(rating))}<span className="text-zinc-300">{'★'.repeat(5 - Math.round(rating))}</span>
              </span>
              <span className="text-xs font-medium text-zinc-700">{rating.toFixed(1)}</span>
              {count > 0 && <span className="text-[11px] text-zinc-400">({count})</span>}
            </div>
          </div>
        </div>
      </PressButton>
    </Link>
  )
}
