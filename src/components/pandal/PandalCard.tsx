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

// src/components/pandal/PandalCard.tsx:16 - dark cards matching navy/yellow site
export default function PandalCard({ pandal }: { pandal: Pandal }) {
  const rating = pandal.avg_rating ?? 4.5
  const count = pandal.rating_count ?? 0
  const hasImage = !!pandal.image_url

  return (
    <Link href={`/pandal/${pandal.slug}`} className="block">
      <PressButton className="w-full text-left group">
        <div className="glass glass-pop rounded-2xl overflow-hidden">
          <div className="h-36 bg-[#020617]/60 flex items-center justify-center relative overflow-hidden border-b border-[#FFD60A]/10">
            {hasImage ? (
              <img src={pandal.image_url!} alt={pandal.name} className="w-full h-full object-cover transition duration-500 group-hover:scale-[1.03]" />
            ) : (
              <div className="text-center p-4">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[#FFD60A]/10 border border-[#FFD60A]/20 flex items-center justify-center text-[#FFD60A] text-sm">◆</div>
                <p className="text-xs text-[#FFD60A]/40">Image coming soon</p>
                <p className="text-[10px] text-white/20 mt-1 font-mono">{pandal.slug}</p>
              </div>
            )}
            <span className="absolute top-2 left-2 text-[10px] bg-[#020617]/70 backdrop-blur border border-[#FFD60A]/20 px-2 py-1 rounded-full text-[#FFD60A]/90">
              {pandal.area}
            </span>
            <span className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition bg-gradient-to-t from-[#FFD60A]/5 to-transparent" />
          </div>
          <div className="p-2.5 md:p-3 relative">
            <h3 className="font-semibold text-[13px] md:text-sm text-white leading-tight line-clamp-2 md:line-clamp-1 break-words">{pandal.name}</h3>
            <p className="text-[11px] md:text-xs text-white/40 mt-0.5 line-clamp-1 break-words">{pandal.address || pandal.area + ', Kolkata'}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="flex text-[#FFD60A] text-xs">
                {'★'.repeat(Math.round(rating))}<span className="text-white/15">{'★'.repeat(5 - Math.round(rating))}</span>
              </span>
              <span className="text-xs font-medium text-[#FFD60A]">{rating.toFixed(1)}</span>
              {count > 0 && <span className="text-[11px] text-white/30">({count})</span>}
            </div>
          </div>
        </div>
      </PressButton>
    </Link>
  )
}
