'use client'
import { useEffect, useRef } from 'react'
import { animate } from 'animejs'

type Props = {
  children: React.ReactNode
  type?: 'fadeUp' | 'press' | 'stagger' | 'fadeIn'
  delay?: number
  className?: string
}

function useReveal<T extends HTMLElement>(scale = false, delay = 0) {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Respect reduced motion — show instantly
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('is-visible')
      return
    }
    if (delay) el.style.transitionDelay = `${delay}ms`
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-visible')
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [delay])
  return ref
}

// src/components/ui/Animated.tsx — minimal IO reveals + animejs press
export function FadeUp({ children, delay = 0, className }: Props) {
  const ref = useReveal<HTMLDivElement>(false, delay)
  return (
    <div ref={ref} className={`reveal ${className ?? ''}`}>
      {children}
    </div>
  )
}

export function Reveal({ children, delay = 0, className, scale = false }: Props & { scale?: boolean }) {
  const ref = useReveal<HTMLDivElement>(scale, delay)
  return (
    <div ref={ref} className={`${scale ? 'reveal-scale' : 'reveal'} ${className ?? ''}`}>
      {children}
    </div>
  )
}

export function StaggerList({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const items = ref.current.children
    if (items.length === 0) return
    // Only animate items not already visible — staggered fade-up, transform+opacity only
    animate(Array.from(items) as HTMLElement[], {
      opacity: [0, 1],
      translateY: [10, 0],
      duration: 420,
      // @ts-ignore animejs delay fn
      delay: (el: unknown, i: number) => Math.min(i, 12) * 55,
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
    const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!reduced) {
      animate(ref.current, {
        scale: isTouch ? [1, 0.96, 1.02, 1] : [1, 0.94, 1.03, 1],
        duration: isTouch ? 280 : 380,
        easing: isTouch ? 'easeOutCubic' : 'easeOutElastic(1, 0.52)',
      })
    }
    onClick?.()
  }
  return <button ref={ref} onTouchStart={() => ref.current?.classList.add('tap-active')} onTouchEnd={() => setTimeout(() => ref.current?.classList.remove('tap-active'), 120)} onClick={handlePress} className={`${className} touch-manipulation select-none will-change-transform active:scale-[0.96] transition-transform duration-150`}>{children}</button>
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    animate(ref.current, {
      opacity: [0, 1],
      duration: 380,
      easing: 'easeOutQuad',
    })
  }, [])
  return <div ref={ref}>{children}</div>
}
