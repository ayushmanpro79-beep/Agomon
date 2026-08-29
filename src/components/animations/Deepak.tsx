'use client'
import { useEffect, useRef } from 'react'
import { animate } from 'animejs'

// src/components/animations/Deepak.tsx:6 - illuminating deepak, used for welcome + browse tab
export function Deepak({ delay = 0, size = 40 }: { delay?: number; size?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const flame = ref.current.querySelector('.flame') as HTMLElement
    if (!flame) return
    animate(flame, {
      scaleY: [0.9, 1.08, 0.95, 1.05, 0.9],
      scaleX: [1, 0.96, 1.02, 0.98, 1],
      translateY: [0, -2, 0, -1, 0],
      duration: 1200,
      delay,
      loop: true,
      easing: 'easeInOutSine',
    })
    animate(ref.current, {
      opacity: [0, 1],
      translateY: [10, 0],
      duration: 600,
      delay,
      easing: 'easeOutQuad',
    })
  }, [delay])
  return (
    <div ref={ref} style={{ width: size, height: size * 1.4 }} className="flex flex-col items-center">
      <div className="flame w-3 h-6 rounded-full bg-gradient-to-t from-orange-600 via-amber-400 to-yellow-200 blur-[0.3px] shadow-[0_0_12px_rgba(255,180,0,0.9)]" style={{ borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%' }} />
      <div className="w-6 h-2 bg-amber-900 rounded-b-full -mt-1" />
      <div className="w-8 h-1.5 bg-amber-950 rounded-full -mt-0.5 opacity-80" />
    </div>
  )
}

export function DeepakRow({ count = 5 }: { count?: number }) {
  return (
    <div className="flex justify-center gap-4 md:gap-8">
      {Array.from({ length: count }).map((_, i) => (
        <Deepak key={i} delay={i * 120} size={i === 2 ? 48 : 36} />
      ))}
    </div>
  )
}
