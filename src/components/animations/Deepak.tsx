'use client'
import { useEffect, useRef } from 'react'
import { animate } from 'animejs'

// src/components/animations/Deepak.tsx:6 - yellow only, minimal
export function Deepak({ delay = 0, size = 36 }: { delay?: number; size?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const flame = ref.current.querySelector('.flame') as HTMLElement
    if (!flame) return
    animate(ref.current, { opacity: [0, 1], duration: 500, delay, easing: 'easeOutQuad' })
    animate(flame, {
      scaleY: [0.9, 1.1, 0.92, 1.06, 0.9],
      opacity: [0.9, 1, 0.88, 1, 0.9],
      duration: 1400,
      delay,
      loop: true,
      easing: 'easeInOutSine',
    } as any)
  }, [delay])
  return (
    <div ref={ref} style={{ width: size, height: size * 1.35 }} className="flex flex-col items-center opacity-0">
      {/* flame - yellow only */}
      <div className="flame w-2.5 h-5 rounded-full bg-[#FFD60A] shadow-[0_0_10px_rgba(255,214,10,0.8)]" style={{ borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%' }} />
      {/* diya body - yellow stroke on dark */}
      <div className="w-5 h-1.5 bg-[#0B1220] border border-[#FFD60A]/60 rounded-b-full -mt-1" />
      <div className="w-7 h-1 bg-[#0B1220] border border-[#FFD60A]/30 rounded-full -mt-0.5" />
    </div>
  )
}

export function CornerDeepaks() {
  return (
    <>
      <div className="absolute top-3 left-3 opacity-60 hidden md:flex"><Deepak size={28} delay={0} /></div>
      <div className="absolute top-3 right-3 opacity-60 hidden md:flex"><Deepak size={28} delay={180} /></div>
      <div className="absolute bottom-3 left-3 opacity-60 hidden md:flex"><Deepak size={28} delay={360} /></div>
      <div className="absolute bottom-3 right-3 opacity-60 hidden md:flex"><Deepak size={28} delay={540} /></div>
      {/* mobile - smaller corner pair */}
      <div className="absolute top-2 left-2 opacity-50 md:hidden"><Deepak size={20} delay={0} /></div>
      <div className="absolute top-2 right-2 opacity-50 md:hidden"><Deepak size={20} delay={200} /></div>
    </>
  )
}
