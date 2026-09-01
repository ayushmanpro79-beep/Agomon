'use client'
import { FadeUp, PageTransition } from '@/components/ui/Animated'
import DurgaEyes from '@/components/animations/DurgaEyes'
import { CornerDeepaks } from '@/components/animations/Deepak'
import AlponaBorder from '@/components/ui/AlponaBorder'
import BlogSection from '@/components/blog/BlogSection'
import Link from 'next/link'

// src/app/page.tsx:12 - welcome only, no browse list, Browse → /browse
export default function Home() {
  return (
    <PageTransition>
      <FadeUp>
        <div className="relative rounded-3xl overflow-hidden glass-strong p-6 md:p-10 text-center min-h-[420px] flex flex-col justify-between">
          <AlponaBorder inset="inset-[8px]" opacity={0.95} />
          {/* Dhak - solid yellow above glass, fade in */}
          <img src="/illustrations/dhak.svg" alt="" aria-hidden draggable={false} className="pointer-events-none absolute bottom-3 left-3 w-10 h-10 md:w-14 md:h-14 z-[3] dhak-fade select-none" style={{ opacity: 0, animationDelay: '0.4s', shapeRendering: 'geometricPrecision' as any, filter: 'drop-shadow(0 0 8px rgba(255,214,10,0.28))' } as any} />
          <img src="/illustrations/dhak.svg" alt="" aria-hidden draggable={false} className="pointer-events-none absolute bottom-3 right-3 w-10 h-10 md:w-14 md:h-14 z-[3] dhak-fade select-none" style={{ opacity: 0, animationDelay: '0.65s', shapeRendering: 'geometricPrecision' as any, filter: 'drop-shadow(0 0 8px rgba(255,214,10,0.28))' } as any} />
          <CornerDeepaks />
          <div>
            <p className="text-[#FFD60A]/60 tracking-[0.3em] text-[10px]">শুভ শারদীয়া</p>
            <h1 className="text-2xl md:text-4xl font-bold text-white mt-1 tracking-tight">আগমন — AGOMON</h1>
            <p className="text-[#FFD60A]/50 text-xs mt-1">45 Popular Pujas of Kolkata</p>
          </div>
          <div className="py-6">
            <DurgaEyes />
            <p className="text-[11px] text-white/30 mt-3">eyes appear closed → slowly open</p>
          </div>
          <div>
            <Link href="/browse" className="inline-block bg-[#FFD60A] text-[#020617] px-10 py-3 rounded-full text-sm font-semibold hover:bg-[#FFE566] transition pc-btn">Browse Pandals 🪔</Link>
            <p className="text-[10px] text-white/20 mt-3">45 pandals • OSM map • Metro nearby</p>
          </div>
        </div>
      </FadeUp>

      <FadeUp delay={200}>
        <BlogSection />
      </FadeUp>

      <FadeUp delay={300}>
        <div className="mt-6 text-center">
          <p className="text-xs text-white/40">Welcome to Agomon. Tap Browse to explore all pandals on the map.</p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/browse" className="text-xs glass border border-[#FFD60A]/20 text-[#FFD60A] px-4 py-2 rounded-full">Go to Browse Map</Link>
          </div>
        </div>
      </FadeUp>
    </PageTransition>
  )
}
