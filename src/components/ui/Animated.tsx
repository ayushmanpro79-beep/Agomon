'use client'
import { useEffect, useRef } from 'react'
import { animate } from 'animejs'

type Props = {
  children: React.ReactNode
  type?: 'fadeUp' | 'press' | 'stagger' | 'fadeIn'
  delay?: number
  className?: string
}

// src/components/ui/Animated.tsx:12 - animejs wrappers for Agomon
export function FadeUp({ children, delay = 0, className }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    animate(ref.current, {
      opacity: [0, 1],
      translateY: [12, 0],
      duration: 600,
      delay,
      easing: 'easeOutCubic',
    })
  }, [delay])
  return <div ref={ref} className={className} style={{ opacity: 0 }}>{children}</div>
}

export function StaggerList({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const items = ref.current.children
    if (items.length === 0) return
    animate(Array.from(items) as HTMLElement[], {
      opacity: [0, 1],
      translateY: [10, 0],
      duration: 500,
      // @ts-ignore animejs delay fn
      delay: (el: unknown, i: number) => i * 60,
      easing: 'easeOutCubic',
    } as any)
  }, [children])
  return <div ref={ref} className={className}>{children}</div>
}

export function PressButton({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  const ref = useRef<HTMLButtonElement>(null)
  const handlePress = () => {
    if (!ref.current) return
    // mobile-optimized pop: lighter elastic on touch for instant feedback
    const isTouch = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches
    animate(ref.current, {
      scale: isTouch ? [1, 0.96, 1.02, 1] : [1, 0.94, 1.03, 1],
      duration: isTouch ? 280 : 380,
      easing: isTouch ? 'easeOutCubic' : 'easeOutElastic(1, 0.52)',
    })
    onClick?.()
  }
  return <button ref={ref} onTouchStart={() => ref.current?.classList.add('tap-active')} onTouchEnd={() => setTimeout(() => ref.current?.classList.remove('tap-active'), 120)} onClick={handlePress} className={`${className} touch-manipulation select-none will-change-transform active:scale-[0.96] transition-transform duration-150`}>{children}</button>
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    animate(ref.current, {
      opacity: [0, 1],
      duration: 400,
      easing: 'easeOutQuad',
    })
  }, [])
  return <div ref={ref}>{children}</div>
}
