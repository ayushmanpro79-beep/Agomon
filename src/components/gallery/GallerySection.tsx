'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import DepthCarousel from '@/components/ui/depth-carousel/DepthCarousel'
import SectionBorder from '@/components/ui/SectionBorder'

type GalleryItem = {
  id: string
  title: string
  label: string | null
  details: string | null
  image_url: string
  image?: string
  alt?: string
}

export default function GallerySection() {
  const [items, setItems] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<GalleryItem | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const { data, error } = await supabase.from('gallery_images').select('id,title,label,details,image_url').eq('is_active', true).order('display_order', { ascending: true }).order('created_at', { ascending: false }).limit(20)
        if (error) throw error
        if (!mounted) return
        const mapped = (data || []).map((r: any) => ({
          id: r.id,
          title: r.title,
          label: r.label,
          details: r.details,
          image_url: r.image_url,
          image: r.image_url,
          alt: r.title,
        }))
        setItems(mapped)
      } catch {
        setItems([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  // lock body scroll when expanded
  useEffect(() => {
    if (expanded) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [expanded])

  // close on Esc
  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded])

  if (loading) {
    return (
      <div className="glass rounded-3xl p-6 text-center">
        <p className="text-xs text-white/40">Loading gallery…</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="glass rounded-3xl p-6 md:p-10 text-center">
        <p className="text-[#FFD60A]/60 tracking-[0.2em] text-[10px]">GALLERY</p>
        <h2 className="text-lg font-bold text-white mt-1">Welcome Gallery</h2>
        <p className="text-sm text-white/60 mt-2">No Posters available</p>
        <p className="text-xs text-white/30 mt-1">Check back soon — admin will add posters and pictures here.</p>
      </div>
    )
  }

  // DepthCarousel expects {image, alt}
  const carouselItems = items.map((it) => ({ image: it.image_url, alt: it.title }))

  return (
    <>
      <div className="glass rounded-3xl overflow-hidden border border-[#FFD60A]/10">
        <div className="px-4 md:px-6 pt-4 md:pt-6 text-center">
          <p className="text-[#FFD60A]/60 tracking-[0.22em] text-[10px]">GALLERY • ছবি</p>
          <h2 className="text-lg md:text-xl font-bold text-white mt-1">Pujo Posters & Moments</h2>
          <p className="text-xs text-white/40 mt-1">Tap the front poster to expand — caption only in expanded view</p>
        </div>

        <div style={{ height: '500px', position: 'relative' }} className="mt-2">
          <DepthCarousel
            items={carouselItems}
            cardWidth={300}
            cardHeight={380}
            radius={18}
            depth={220}
            spread={90}
            tilt={22}
            tiltDirection="right"
            perspective={1400}
            visibleCards={4}
            falloff={0.2}
            blur={6}
            autoplay
            loop
            showControls
            showIndicators
            onCardClick={(_, item) => {
              // find original item by image
              const found = items.find((x) => x.image_url === (item as any).image)
              if (found) setExpanded(found)
            }}
          />
        </div>

        <p className="text-[11px] text-white/25 text-center pb-3">Drag, swipe, or use arrows • front card tap expands</p>
      </div>

      {/* Expanded view — lightbox with image + caption (label+details) */}
      {expanded && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#020617]/80 backdrop-blur-md" onClick={() => setExpanded(null)} />
          <div className="relative w-full max-w-[880px] max-h-[90vh] overflow-hidden glass-strong rounded-3xl border border-[#FFD60A]/20 shadow-[0_16px_48px_rgba(0,0,0,0.6)] animate-[gallery-pop_300ms_cubic-bezier(0.16,1,0.3,1)] flex flex-col">
            <button
              onClick={() => setExpanded(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-[#0B1220] border border-[#FFD60A]/20 text-white/70 hover:text-white hover:border-[#FFD60A]/30 grid place-items-center"
              aria-label="Close"
            >
              ✕
            </button>

            <div className="flex-1 overflow-auto">
              <div className="relative w-full bg-[#0B1220] flex items-center justify-center p-3 md:p-4">
                <img src={expanded.image_url} alt={expanded.title} className="max-h-[58vh] w-auto max-w-full object-contain rounded-2xl border border-[#FFD60A]/10 shadow-lg" />
              </div>

              <div className="p-4 md:p-6">
                <h3 className="text-lg md:text-xl font-bold text-white">{expanded.title}</h3>
                {expanded.label && <p className="text-xs font-semibold text-[#FFD60A] mt-1">{expanded.label}</p>}
                {expanded.details ? (
                  <p className="text-sm text-white/70 mt-2 leading-relaxed">{expanded.details}</p>
                ) : (
                  <p className="text-sm text-white/30 mt-2 italic">No additional details.</p>
                )}
                <p className="text-[11px] text-white/20 mt-3">Tap outside or ✕ to close • caption only in expanded view</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes gallery-pop { from { opacity:0; transform: scale(0.96) translateY(8px);} to {opacity:1; transform: scale(1) translateY(0);} }`}</style>
    </>
  )
}
