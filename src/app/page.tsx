'use client'
import { FadeUp, PageTransition } from '@/components/ui/Animated'
import DurgaEyes from '@/components/animations/DurgaEyes'
import { CornerDeepaks } from '@/components/animations/Deepak'
import BlogSection from '@/components/blog/BlogSection'
import SectionBorder from '@/components/ui/SectionBorder'
import Link from 'next/link'
import { DiyaLottie, ShankhaLottie, TrishulLottie } from '@/components/decor/FestiveLottie'

// src/app/page.tsx:12 - welcome only, no browse list, Browse → /browse
export default function Home() {
  return (
    <PageTransition>
      <FadeUp>
        <SectionBorder />
        <div className="relative rounded-3xl overflow-hidden glass-strong p-6 md:p-10 text-center min-h-[420px] flex flex-col justify-between">
          {/* NEW: Corner mandalas — festive frame (additive, hidden on mobile to keep clean) */}
          <img src="/illustrations/corner-mandala.svg" alt="" aria-hidden draggable={false} className="pointer-events-none select-none absolute top-3 left-3 w-[68px] h-[68px] md:w-[84px] md:h-[84px] opacity-[0.88] hidden md:block" style={{ filter: 'drop-shadow(0 0 6px rgba(255,214,10,0.22))' } as any} />
          <img src="/illustrations/corner-mandala.svg" alt="" aria-hidden draggable={false} className="pointer-events-none select-none absolute top-3 right-3 w-[68px] h-[68px] md:w-[84px] md:h-[84px] opacity-[0.88] hidden md:block" style={{ transform: 'scaleX(-1)', filter: 'drop-shadow(0 0 6px rgba(255,214,10,0.22))' } as any} />
          <img src="/illustrations/corner-mandala.svg" alt="" aria-hidden draggable={false} className="pointer-events-none select-none absolute bottom-3 left-3 w-[64px] h-[64px] md:w-[78px] md:h-[78px] opacity-[0.72] hidden md:block" style={{ transform: 'scaleY(-1)', filter: 'drop-shadow(0 0 6px rgba(255,214,10,0.18))' } as any} />
          <img src="/illustrations/corner-mandala.svg" alt="" aria-hidden draggable={false} className="pointer-events-none select-none absolute bottom-3 right-3 w-[64px] h-[64px] md:w-[78px] md:h-[78px] opacity-[0.72] hidden md:block" style={{ transform: 'scale(-1)', filter: 'drop-shadow(0 0 6px rgba(255,214,10,0.18))' } as any} />
          {/* Dhak - solid yellow above glass, fade in - larger, left rotated inwards (wrapper handles flip so fade not overridden) */}
          <div className="pointer-events-none absolute bottom-4 left-4 w-16 h-16 md:w-20 md:h-20 z-[3] dhak-fade select-none" style={{ opacity: 0, animationDelay: '0.4s' } as any}>
            <img src="/illustrations/dhak.svg" alt="" aria-hidden draggable={false} className="w-full h-full" style={{ transform: 'scaleX(-1)', shapeRendering: 'geometricPrecision' as any, filter: 'drop-shadow(0 0 10px rgba(255,214,10,0.32))' } as any} />
          </div>
          <div className="pointer-events-none absolute bottom-4 right-4 w-16 h-16 md:w-20 md:h-20 z-[3] dhak-fade select-none" style={{ opacity: 0, animationDelay: '0.65s' } as any}>
            <img src="/illustrations/dhak.svg" alt="" aria-hidden draggable={false} className="w-full h-full" style={{ shapeRendering: 'geometricPrecision' as any, filter: 'drop-shadow(0 0 10px rgba(255,214,10,0.32))' } as any} />
          </div>
          <CornerDeepaks />
          <div>
            <p className="text-[#FFD60A]/60 tracking-[0.3em] text-[10px]">শুভ শারদীয়া</p>
            <h1 className="text-2xl md:text-4xl font-bold text-white mt-1 tracking-tight">আগমন — AGOMON</h1>
            <p className="text-[#FFD60A]/50 text-xs mt-1">Explore Various Pandals in Kolkata</p>
            {/* NEW: subtle festive lotties + icons — diya glow + shankha + trishul (additive) */}
            <div className="mt-3 flex items-center justify-center gap-2 md:gap-3">
              <span className="hidden md:flex items-center opacity-90" title="Diya"><DiyaLottie size={28} /></span>
              <span className="flex items-center gap-1.5 rounded-full border border-[#FFD60A]/15 bg-[#FFD60A]/10 px-2.5 py-1">
                <img src="/illustrations/shankha.svg" alt="" className="w-4 h-4 object-contain" />
                <span className="text-[10px] tracking-widest text-[#FFD60A]/80">ॐ SHANKHA</span>
              </span>
              <span className="hidden sm:inline-flex items-center opacity-90" title="Trishul"><TrishulLottie size={22} /></span>
              <span className="flex items-center gap-1.5 rounded-full border border-[#FFD60A]/15 bg-[#FFD60A]/10 px-2.5 py-1">
                <img src="/illustrations/trishul.svg" alt="" className="w-3.5 h-[22px] object-contain" />
                <span className="text-[10px] tracking-widest text-[#FFD60A]/80">TRISHUL</span>
              </span>
              <span className="hidden md:flex items-center opacity-90" title="Shankha blow"><ShankhaLottie size={30} /></span>
            </div>
          </div>
          <div className="py-6">
            <DurgaEyes />
            <p className="text-[11px] text-white/30 mt-3">eyes appear closed → slowly open</p>
          </div>
          <div>
            <Link href="/browse" className="inline-block bg-[#FFD60A] text-[#020617] px-10 py-3 rounded-full text-sm font-semibold hover:bg-[#FFE566] transition pc-btn">Browse Pandals 🪔</Link>
            <p className="text-[10px] text-white/20 mt-3">Explore Various Pandals in Kolkata • OSM map • Metro nearby</p>
          </div>
        </div>
        <SectionBorder className="mt-3 rotate-180" />
      </FadeUp>

      <FadeUp delay={200}>
        <SectionBorder />
        <BlogSection />
        <SectionBorder className="mt-3 rotate-180" />
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
