'use client'
import dynamic from 'next/dynamic'
import { useMemo } from 'react'

// lottie-react is client-only; dynamic import avoids SSR issues
const Lottie = dynamic(() => import('lottie-react').then(m => (m as any).default ?? (m as any).Lottie ?? m), { ssr: false }) as any

// JSON imports - these are static and tree-shaken
import diyaAnim from '@/../public/lottie/diya-flicker.json'
import dhakAnim from '@/../public/lottie/dhak-beat.json'
import petalsAnim from '@/../public/lottie/petals-fall.json'
import shankhaAnim from '@/../public/lottie/shankha-blow.json'
import trishulAnim from '@/../public/lottie/trishul-glow.json'

type Props = {
  size?: number
  className?: string
  loop?: boolean
  autoplay?: boolean
  style?: React.CSSProperties
}

// ── Individual lotties ──────────────────────────────────────────
// Use these anywhere: <DiyaLottie size={56} />

export function DiyaLottie({ size = 64, className = '', loop = true, autoplay = true, style }: Props) {
  return (
    <div className={className} style={{ width: size, height: size, ...style }}>
      <Lottie animationData={diyaAnim as any} loop={loop} autoplay={autoplay} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}

export function DhakLottie({ size = 96, className = '', loop = true, autoplay = true, style }: Props) {
  return (
    <div className={className} style={{ width: size, height: size * 0.72, ...style }}>
      <Lottie animationData={dhakAnim as any} loop={loop} autoplay={autoplay} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}

export function ShankhaLottie({ size = 80, className = '', loop = true, autoplay = true, style }: Props) {
  return (
    <div className={className} style={{ width: size, height: size * 0.66, ...style }}>
      <Lottie animationData={shankhaAnim as any} loop={loop} autoplay={autoplay} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}

export function TrishulLottie({ size = 64, className = '', loop = true, autoplay = true, style }: Props) {
  return (
    <div className={className} style={{ width: size, height: size * 1.75, ...style }}>
      <Lottie animationData={trishulAnim as any} loop={loop} autoplay={autoplay} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}

/**
 * Floating petals overlay - fixed position, pointer-events none.
 * Drop <PetalsOverlay /> at the root of your layout for a site-wide festive fall.
 * Density + opacity are tunable; respects prefers-reduced-motion.
 */
export function PetalsOverlay({
  className = '',
  style,
  opacity = 0.55,
}: {
  className?: string
  style?: React.CSSProperties
  opacity?: number
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 z-[2] overflow-hidden ${className}`}
      style={{ opacity, ...style }}
    >
      <Lottie
        animationData={petalsAnim as any}
        loop
        autoplay
        style={{ width: '100%', height: '100%' }}
        // petals canvas is 200x200 - stretch to viewport
      />
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          div[aria-hidden].fixed { display: none; }
        }
      `}</style>
    </div>
  )
}

/**
 * Generic <FestiveLottie type="diya|dhak|shankha|trishul|petals" />
 */
export function FestiveLottie({
  type,
  size,
  className,
  loop,
  autoplay,
}: {
  type: 'diya' | 'dhak' | 'shankha' | 'trishul' | 'petals'
  size?: number
  className?: string
  loop?: boolean
  autoplay?: boolean
}) {
  const map = useMemo(
    () => ({
      diya: diyaAnim,
      dhak: dhakAnim,
      shankha: shankhaAnim,
      trishul: trishulAnim,
      petals: petalsAnim,
    }),
    []
  )
  const data = map[type]
  // petals is full-screen; treat differently
  if (type === 'petals') return <PetalsOverlay />
  return (
    <div className={className} style={{ width: size ?? 64, height: size ?? 64 }}>
      <Lottie animationData={data as any} loop={loop ?? true} autoplay={autoplay ?? true} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}

export const FESTIVE_LOTTIES = {
  diya: '/lottie/diya-flicker.json',
  dhak: '/lottie/dhak-beat.json',
  petals: '/lottie/petals-fall.json',
  shankha: '/lottie/shankha-blow.json',
  trishul: '/lottie/trishul-glow.json',
} as const
