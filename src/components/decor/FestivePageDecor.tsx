'use client'
// src/components/decor/FestivePageDecor.tsx
// Optional one-line festive dressing for any page.
// DOES NOT override existing page.tsx - import it only where you want extra festivity.
// Example: in src/app/page.tsx add <FestivePageDecor variant="home" /> at the top.

// This component is purely additive - it renders decorative layers with pointer-events-none
// so it never interferes with clicks or layout. Remove it any time.

import { AlpanaBorder, JhalarLights, MarigoldGarland, KashPhool, CornerMandala } from './FestiveSVG'
import { PetalsOverlay } from './FestiveLottie'

type Props = {
  variant?: 'home' | 'minimal' | 'full'
  showPetals?: boolean
  petalsOpacity?: number
  className?: string
}

export default function FestivePageDecor({ variant = 'minimal', showPetals = false, petalsOpacity = 0.32, className = '' }: Props) {
  if (variant === 'minimal') {
    return (
      <div aria-hidden className={`pointer-events-none ${className}`}>
        {/* subtle top toran only */}
        <div className="w-full overflow-hidden opacity-90">
          <MarigoldGarland className="w-full h-auto" />
        </div>
        {showPetals && <PetalsOverlay opacity={petalsOpacity} />}
      </div>
    )
  }

  if (variant === 'home') {
    return (
      <div aria-hidden className={`pointer-events-none ${className}`}>
        {/* top: garland + jhalar */}
        <div className="w-full overflow-hidden -mx-4">
          <MarigoldGarland className="w-full" />
          <JhalarLights className="w-full -mt-2" />
        </div>
        {/* floating petals - very subtle on home so it doesn't compete with DurgaEyes */}
        {showPetals && <PetalsOverlay opacity={petalsOpacity} />}

        {/* corner hints for the hero - positioned absolute inside a relative parent is cleaner;
            here we just render the bottom strip helper; caller can place <FestiveCorners> around hero instead */}
        <style>{`
          @media (prefers-reduced-motion: reduce) {
            .festive-home-anim { animation: none !important; }
          }
        `}</style>
      </div>
    )
  }

  // full - for Browse/About/welcome pages that want full dressing
  return (
    <div aria-hidden className={`pointer-events-none ${className}`}>
      <div className="w-full overflow-hidden">
        <MarigoldGarland className="w-full" />
        <JhalarLights className="w-full -mt-2" />
      </div>
      {showPetals && <PetalsOverlay opacity={petalsOpacity} />}
      <div className="w-full overflow-hidden mt-4">
        <KashPhool className="w-full" />
        <AlpanaBorder className="mt-2" />
      </div>
      {/* corner mandalas - hidden on mobile to reduce clutter */}
      <div className="hidden md:block fixed top-[68px] left-3 z-[1] opacity-60">
        <CornerMandala size={64} />
      </div>
      <div className="hidden md:block fixed top-[68px] right-3 z-[1] opacity-60">
        <CornerMandala size={64} flipX />
      </div>
    </div>
  )
}

// ── Small inline badge for cards / headings ───────────────────
// <PujaBadge label="শুভ শারদীয়া" />
export function PujaBadge({ label = 'শুভ শারদীয়া', className = '' }: { label?: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-[#FFD60A]/20 bg-[#FFD60A]/10 px-3 py-1 text-[11px] tracking-widest text-[#FFD60A]/90 backdrop-blur ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[#FFD60A] shadow-[0_0_8px_rgba(255,214,10,0.9)]" aria-hidden />
      {label}
    </span>
  )
}
