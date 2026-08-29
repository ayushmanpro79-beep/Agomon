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
    animate(ref.current, {
      scale: [1, 0.96, 1],
      duration: 250,
      easing: 'easeOutCubic',
    })
    onClick?.()
  }
  return <button ref={ref} onClick={handlePress} className={className}>{children}</button>
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
