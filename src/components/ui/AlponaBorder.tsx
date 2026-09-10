'use client'
// Yellow alpona frame - crisp vector above glass, never blurred
export default function AlponaBorder({
  opacity = 0.85,
  inset = 'inset-[6px]',
  radius = 'rounded-[inherit]',
}: {
  opacity?: number
  inset?: string
  radius?: string
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute ${inset} ${radius} overflow-hidden z-[1]`}
      style={{ opacity, filter: 'none', backdropFilter: 'none', WebkitBackdropFilter: 'none' as any }}
    >
      {/* Full frame SVG - stretched to container, vector stays crisp */}
      <img
        src="/illustrations/alpona-frame.svg"
        alt=""
        draggable={false}
        className="absolute inset-0 w-full h-full"
        style={{
          objectFit: 'fill',
          shapeRendering: 'geometricPrecision' as any,
          imageRendering: 'crisp-edges' as any,
          filter: 'drop-shadow(0 0 6px rgba(255,214,10,0.18))',
        }}
      />
      {/* Subtle inner vignette to lift above glass without blur */}
      <div className={`absolute inset-0 ${radius} border border-[#FFD60A]/10 pointer-events-none`} />
    </div>
  )
}

export function AlponaCorners({ size = 56 }: { size?: number }) {
  // Lightweight corner-only variant for small cards if needed
  return (
    <>
      <span aria-hidden className="pointer-events-none absolute top-0 left-0 z-[1] opacity-70" style={{ width: size, height: size, background: `url(/illustrations/alpona-frame.svg) no-repeat`, backgroundSize: '850px 1134px', backgroundPosition: '0 0', filter: 'none' }} />
      <span aria-hidden className="pointer-events-none absolute top-0 right-0 z-[1] opacity-70" style={{ width: size, height: size, background: `url(/illustrations/alpona-frame.svg) no-repeat`, backgroundSize: '850px 1134px', backgroundPosition: '-790px 0', filter: 'none', transform: 'scaleX(-1)' } as any} />
    </>
  )
}
