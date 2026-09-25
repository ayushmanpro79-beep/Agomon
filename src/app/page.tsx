'use client'
import { useEffect, useState } from 'react'
import { FadeUp, PageTransition, Reveal } from '@/components/ui/Animated'
import DurgaEyes from '@/components/animations/DurgaEyes'
import { CornerDeepaks } from '@/components/animations/Deepak'
import BlogSection from '@/components/blog/BlogSection'
import SectionBorder from '@/components/ui/SectionBorder'
import InstallGuide from '@/components/pwa/InstallGuide'
import GallerySection from '@/components/gallery/GallerySection'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'

// src/app/page.tsx — minimal modern welcome, same palette, limited motion
export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [authChecked, setAuthChecked] = useState(false)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { setUser(data.user); setAuthChecked(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      setAuthChecked(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])
  return (
    <PageTransition>
      <FadeUp>
        <SectionBorder />
        <div className="relative rounded-[28px] overflow-hidden glass-strong text-center">
          <div className="hero-grid absolute inset-0" aria-hidden />
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-56 w-[420px] rounded-full bg-[#FFD60A]/10 blur-3xl" aria-hidden />
          {/* Dhak accents — smaller, floating, minimal */}
          <div className="pointer-events-none absolute bottom-5 left-5 w-12 h-12 md:w-14 md:h-14 z-[3] dhak-fade float-soft select-none" style={{ opacity: 0, animationDelay: '0.4s' } as any}>
            <img src="/illustrations/dhak.svg" alt="" aria-hidden draggable={false} className="w-full h-full" style={{ transform: 'scaleX(-1)', shapeRendering: 'geometricPrecision' as any, filter: 'drop-shadow(0 0 10px rgba(255,214,10,0.28))' } as any} />
          </div>
          <div className="pointer-events-none absolute bottom-5 right-5 w-12 h-12 md:w-14 md:h-14 z-[3] dhak-fade float-slow select-none" style={{ opacity: 0, animationDelay: '0.65s' } as any}>
            <img src="/illustrations/dhak.svg" alt="" aria-hidden draggable={false} className="w-full h-full" style={{ shapeRendering: 'geometricPrecision' as any, filter: 'drop-shadow(0 0 10px rgba(255,214,10,0.28))' } as any} />
          </div>
          <CornerDeepaks />
          <span className="spark" style={{ left: '30%', animationDelay: '0.6s' }} aria-hidden />
          <span className="spark" style={{ left: '48%', animationDelay: '1.7s' }} aria-hidden />
          <span className="spark hidden md:block" style={{ left: '64%', animationDelay: '2.6s' }} aria-hidden />
          <div className="relative px-6 pt-10 pb-8 md:px-12 md:pt-12 md:pb-10 flex flex-col items-center">
            <span className="chip-minimal px-3 py-1.5 tracking-[0.18em] text-[10px] text-[#FFD60A]"><span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#FFD60A]" /> LIVE • KOLKATA 2026</span>
            <p className="text-[#FFD60A]/60 tracking-[0.3em] text-[10px] mt-4">শুভ শারদীয়া</p>
            <h1 className="text-balance text-3xl md:text-5xl font-bold text-white mt-2 tracking-tight leading-[1.05]">আগমন — AGOMON</h1>
            <p className="text-[#FFF8E1]/60 text-sm md:text-[15px] mt-3 max-w-md text-balance">Your Durga Pujo superpower. Live map, smarter hops, crowd-aware nights.</p>
            <div className="py-6">
              <DurgaEyes />
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 w-full sm:w-auto">
              <Link href="/browse" className="btn-primary btn-island group pl-8 pr-2 py-2 text-sm w-full sm:w-auto min-h-[48px]">Browse Pandals <span className="island-arrow">→</span></Link>
              {authChecked && !user ? (
                <Link href="/login" className="btn-ghost btn-island group pl-7 pr-2 py-2 text-xs font-semibold w-full sm:w-auto min-h-[48px]">Login / Sign Up <span className="island-arrow">→</span></Link>
              ) : (
                <Link href="/pujo-routing" className="btn-ghost btn-island group pl-7 pr-2 py-2 text-xs font-semibold w-full sm:w-auto min-h-[48px]">Plan a route <span className="island-arrow">→</span></Link>
              )}
            </div>
            <div className="stagger mt-6 flex flex-wrap items-center justify-center gap-2" aria-label="Highlights">
              <span className="chip-minimal px-3 py-1.5" style={{ animationDelay: '80ms' }}>110+ pandals</span>
              <span className="chip-minimal px-3 py-1.5" style={{ animationDelay: '160ms' }}>26 metros • 2.2 km</span>
              <span className="chip-minimal px-3 py-1.5" style={{ animationDelay: '240ms' }}>1919 bus routes</span>
              <span className="chip-minimal px-3 py-1.5" style={{ animationDelay: '320ms' }}>48-slot crowd meter</span>
            </div>
            <p className="text-[10px] text-white/25 mt-4">OSM map • Metro nearby • No fake routes</p>
          </div>
        </div>
        <SectionBorder className="mt-3 rotate-180" />
      </FadeUp>

      <Reveal>
        <div className="ticker mt-4" aria-label="Areas — tap to browse">
          <div className="ticker-track">
            {['South Kolkata', 'North Kolkata', 'Dumdum', 'Salt Lake & Rajarhat', 'Central Kolkata', 'West Kolkata & Behala'].map((a) => (
              <Link key={`t1-${a}`} href={`/browse?area=${encodeURIComponent(a)}`} className="ticker-pill">◆ {a}</Link>
            ))}
            {['South Kolkata', 'North Kolkata', 'Dumdum', 'Salt Lake & Rajarhat', 'Central Kolkata', 'West Kolkata & Behala'].map((a) => (
              <Link key={`t2-${a}`} href={`/browse?area=${encodeURIComponent(a)}`} className="ticker-pill" aria-hidden tabIndex={-1}>◆ {a}</Link>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mt-4">
          <Link href="/browse" className="group glass card-lift rounded-2xl p-5 text-left md:col-span-2 flex flex-col justify-between min-h-[148px]">
            <div>
              <p className="chip-minimal px-2.5 py-1 text-[#FFD60A] w-max">Live map</p>
              <p className="text-base font-semibold text-white mt-2.5 tracking-tight">Browse every pandal on one map</p>
              <p className="text-[13px] text-white/45 mt-1 leading-relaxed max-w-[52ch]">Filter by area, metro and crowd. Tap any diya pin for metros, landmarks and reviews.</p>
            </div>
            <p className="mt-3 inline-flex items-center gap-2 text-[13px] font-semibold text-[#FFD60A]">Open browse <span className="island-arrow inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#FFD60A]/10 border border-[#FFD60A]/20 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5">→</span></p>
          </Link>
          <div className="grid grid-cols-1 gap-2.5">
            <Link href="/pujo-routing/create" className="group glass card-lift rounded-2xl p-4 text-left flex items-center gap-3 min-h-[68px]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFD60A]/10 border border-[#FFD60A]/20 text-[#FFD60A]">⇄</span>
              <span>
                <span className="block text-sm font-semibold text-white">Hop optimizer</span>
                <span className="block text-xs text-white/40 mt-0.5">2–10 pandals, road order</span>
              </span>
              <span className="ml-auto text-[#FFD60A] transition group-hover:translate-x-0.5">→</span>
            </Link>
            <Link href="/travel-plan" className="group glass card-lift rounded-2xl p-4 text-left flex items-center gap-3 min-h-[68px]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFD60A]/10 border border-[#FFD60A]/20 text-[#FFD60A]">▤</span>
              <span>
                <span className="block text-sm font-semibold text-white">Bus + metro</span>
                <span className="block text-xs text-white/40 mt-0.5">Verified fare & time</span>
              </span>
              <span className="ml-auto text-[#FFD60A] transition group-hover:translate-x-0.5">→</span>
            </Link>
          </div>
        </div>
      </Reveal>

      <FadeUp delay={150}>
        <SectionBorder />
        <GallerySection />
        <SectionBorder className="mt-3 rotate-180" />
      </FadeUp>

      <FadeUp delay={170}>
        <SectionBorder />
        <InstallGuide />
        <SectionBorder className="mt-3 rotate-180" />
      </FadeUp>

      <FadeUp delay={200}>
        <SectionBorder />
        <BlogSection />
        <SectionBorder className="mt-3 rotate-180" />
      </FadeUp>
    </PageTransition>
  )
}
