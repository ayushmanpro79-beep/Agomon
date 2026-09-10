'use client'
// src/components/decor/FestiveSVG.tsx
// Thin wrappers around the new SVG illustrations in /public/illustrations
// All SVGs are gold/vermillion on transparent - designed for the dark #020617 theme
// Usage: import { MarigoldGarland, AlpanaBorder, JhalarLights } from '@/components/decor/FestiveSVG'

import React from 'react'

type SvgProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  src: string
  alt?: string
}

// Base img helper - keeps svgs crisp and non-draggable
function DecoImg({ src, alt = '', className = '', style, ...rest }: SvgProps) {
  return (
    <img
      src={src}
      alt={alt}
      aria-hidden={alt === ''}
      draggable={false}
      className={`select-none pointer-events-none ${className}`}
      style={{ shapeRendering: 'geometricPrecision' as any, ...style }}
      {...rest}
    />
  )
}

// ── Banners / Borders (horizontal, full-width) ────────────────

export function AlpanaBorder({ className = '', flip = false, opacity = 0.92 }: { className?: string; flip?: boolean; opacity?: number }) {
  return (
    <div
      aria-hidden
      className={`w-full h-[58px] md:h-[78px] ${className}`}
      style={{
        backgroundImage: 'url(/illustrations/alpana-border.svg)',
        backgroundRepeat: 'repeat-x',
        backgroundSize: 'auto 100%',
        backgroundPosition: 'center',
        transform: flip ? 'scaleY(-1)' : undefined,
        opacity,
        filter: 'drop-shadow(0 0 6px rgba(255,214,10,0.18))',
      }}
    />
  )
}

export function MarigoldGarland({ className = '', opacity = 1 }: { className?: string; opacity?: number }) {
  return (
    <DecoImg
      src="/illustrations/marigold-garland.svg"
      className={`w-full h-auto ${className}`}
      style={{ opacity, filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.45))' }}
    />
  )
}

export function JhalarLights({ className = '', opacity = 1 }: { className?: string; opacity?: number }) {
  return (
    <DecoImg
      src="/illustrations/jhalar-lights.svg"
      className={`w-full h-auto ${className}`}
      style={{ opacity, filter: 'drop-shadow(0 0 8px rgba(255,214,10,0.22))' }}
    />
  )
}

export function KashPhool({ className = '', opacity = 0.85 }: { className?: string; opacity?: number }) {
  return (
    <DecoImg
      src="/illustrations/kash-phool.svg"
      className={`w-full h-auto ${className}`}
      style={{ opacity, filter: 'drop-shadow(0 2px 10px rgba(255,255,255,0.08))' }}
    />
  )
}

// ── Corner / Icon motifs (square) ─────────────────────────────

export function CornerMandala({
  className = '',
  size = 88,
  flipX = false,
  flipY = false,
  opacity = 0.9,
}: {
  className?: string
  size?: number
  flipX?: boolean
  flipY?: boolean
  opacity?: number
}) {
  const tx = `${flipX ? 'scaleX(-1)' : ''} ${flipY ? 'scaleY(-1)' : ''}`.trim()
  return (
    <DecoImg
      src="/illustrations/corner-mandala.svg"
      className={className}
      style={{
        width: size,
        height: size,
        opacity,
        transform: tx || undefined,
        filter: 'drop-shadow(0 0 6px rgba(255,214,10,0.22))',
      }}
    />
  )
}

export function TrishulIcon({ size = 48, className = '', opacity = 0.95 }: { size?: number; className?: string; opacity?: number }) {
  return <DecoImg src="/illustrations/trishul.svg" className={className} style={{ width: size, height: size * 2, opacity }} />
}

export function ShankhaIcon({ size = 48, className = '', opacity = 0.95 }: { size?: number; className?: string; opacity?: number }) {
  return <DecoImg src="/illustrations/shankha.svg" className={className} style={{ width: size, height: size * 1.18, opacity }} />
}

export function DhunuchiIcon({ size = 56, className = '', opacity = 0.95 }: { size?: number; className?: string; opacity?: number }) {
  return <DecoImg src="/illustrations/dhunuchi.svg" className={className} style={{ width: size, height: size * 1.4, opacity }} />
}

// Backward-compat: existing scandi border wrapper stays untouched
// This file only ADDS new visuals - it does not replace SectionBorder

// ── Composite helpers ─────────────────────────────────────────

/**
 * Top festive banner - marigold toran + subtle jhalar underneath.
 * Use once at the very top of a page (below header).
 */
export function FestiveTopBanner({ withJhalar = true, className = '' }: { withJhalar?: boolean; className?: string }) {
  return (
    <div aria-hidden className={`w-full overflow-hidden ${className}`}>
      <MarigoldGarland className="w-full" />
      {withJhalar && <JhalarLights className="w-full -mt-2 md:-mt-3" opacity={0.95} />}
    </div>
  )
}

/**
 * Bottom festive footer strip - alpana + kash phool
 */
export function FestiveBottomStrip({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden className={`w-full overflow-hidden ${className}`}>
      <KashPhool className="w-full max-h-[86px] object-cover" />
      <AlpanaBorder className="mt-1" />
    </div>
  )
}

/**
 * Corner decoration frame - places mandalas in 2 or 4 corners of a relative container.
 * Wrap your hero/card with <FestiveCorners><YourCard/></FestiveCorners>
 */
export function FestiveCorners({
  children,
  corners = 4,
  size = 72,
  className = '',
}: {
  children: React.ReactNode
  corners?: 2 | 4
  size?: number
  className?: string
}) {
  return (
    <div className={`relative ${className}`}>
      <div className="pointer-events-none absolute top-2 left-2 z-[2]">
        <CornerMandala size={size} />
      </div>
      <div className="pointer-events-none absolute top-2 right-2 z-[2]">
        <CornerMandala size={size} flipX />
      </div>
      {corners === 4 && (
        <>
          <div className="pointer-events-none absolute bottom-2 left-2 z-[2]">
            <CornerMandala size={size} flipY />
          </div>
          <div className="pointer-events-none absolute bottom-2 right-2 z-[2]">
            <CornerMandala size={size} flipX flipY />
          </div>
        </>
      )}
      {children}
    </div>
  )
}

export const FESTIVE_SVGS = {
  alpana: '/illustrations/alpana-border.svg',
  garland: '/illustrations/marigold-garland.svg',
  jhalar: '/illustrations/jhalar-lights.svg',
  kash: '/illustrations/kash-phool.svg',
  corner: '/illustrations/corner-mandala.svg',
  trishul: '/illustrations/trishul.svg',
  shankha: '/illustrations/shankha.svg',
  dhunuchi: '/illustrations/dhunuchi.svg',
  // existing (untouched)
  dhak: '/illustrations/dhak.svg',
  scandi: '/illustrations/scandi-border.svg',
} as const
