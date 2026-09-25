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

// src/components/pandal/PandalCard.tsx — minimal modern card, same palette
export default function PandalCard({ pandal }: { pandal: Pandal }) {
  const rating = pandal.avg_rating ?? 4.5
  const count = pandal.rating_count ?? 0
  const hasImage = !!pandal.image_url

  return (
    <Link href={`/pandal/${pandal.slug}`} className="block group">
      <PressButton className="w-full text-left">
        <div className="glass card-lift rounded-2xl overflow-hidden">
          <div className="h-36 bg-[#020617]/60 flex items-center justify-center relative overflow-hidden border-b border-[#FFD60A]/10">
            {hasImage ? (
              <img src={pandal.image_url!} alt={pandal.name} loading="lazy" className="w-full h-full object-cover transition duration-700 ease-out group-hover:scale-[1.05]" />
            ) : (
              <div className="text-center p-4">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[#FFD60A]/10 border border-[#FFD60A]/20 flex items-center justify-center text-[#FFD60A] text-sm">◆</div>
                <p className="text-xs text-[#FFD60A]/40">Image coming soon</p>
                <p className="text-[10px] text-white/20 mt-1 font-mono">{pandal.slug}</p>
              </div>
            )}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#020617]/50 via-transparent to-transparent" />
            <span className="absolute top-2 left-2 text-[10px] font-medium bg-[#020617]/75 backdrop-blur px-2 py-1 rounded-full text-[#FFD60A]/90 border border-[#FFD60A]/15">
              {pandal.area}
            </span>
            <span className="absolute bottom-2 right-2 text-[10px] bg-[#FFD60A] text-[#020617] font-bold px-2 py-0.5 rounded-full opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition duration-300">View →</span>
          </div>
          <div className="p-3 relative">
            <h3 className="font-semibold text-[13px] md:text-sm text-white leading-tight line-clamp-2 break-words text-balance">{pandal.name}</h3>
            <p className="text-[11px] md:text-xs text-white/40 mt-1 line-clamp-1 break-words">{pandal.address || pandal.area + ', Kolkata'}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="flex text-[#FFD60A] text-xs leading-none" aria-label={`Rated ${rating.toFixed(1)} out of 5`}>
                {'★'.repeat(Math.round(rating))}<span className="text-white/15">{'★'.repeat(5 - Math.round(rating))}</span>
              </span>
              <span className="text-xs font-semibold text-[#FFD60A]">{rating.toFixed(1)}</span>
              {count > 0 && <span className="text-[11px] text-white/30">({count})</span>}
            </div>
          </div>
        </div>
      </PressButton>
    </Link>
  )
}
