'use client'
// 4 small diyas - lowest background layer, festive mood, crisp, not blurred
export default function DiyaBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ filter: 'none', backdropFilter: 'none' }}
    >
      {/* subtle vignette for festive depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#020617]/20" />

      {/* Diya 1 - bottom left */}
      <img
        src="/illustrations/diya.svg"
        alt=""
        draggable={false}
        className="absolute select-none diya-flicker"
        style={{
          width: 52,
          height: 52,
          left: '2.5%',
          bottom: '3%',
          opacity: 0.92,
          shapeRendering: 'geometricPrecision' as any,
          imageRendering: 'crisp-edges' as any,
          filter: 'drop-shadow(0 2px 8px rgba(249,193,27,0.35)) drop-shadow(0 0 14px rgba(242,133,0,0.25))',
        }}
      />
      {/* Diya 2 - bottom right */}
      <img
        src="/illustrations/diya.svg"
        alt=""
        draggable={false}
        className="absolute select-none diya-flicker"
        style={{
          width: 48,
          height: 48,
          right: '3%',
          bottom: '4.5%',
          opacity: 0.9,
          animationDelay: '0.7s',
          shapeRendering: 'geometricPrecision' as any,
          filter: 'drop-shadow(0 2px 8px rgba(249,193,27,0.32)) drop-shadow(0 0 12px rgba(242,133,0,0.22))',
        }}
      />
      {/* Diya 3 - bottom left-center */}
      <img
        src="/illustrations/diya.svg"
        alt=""
        draggable={false}
        className="absolute select-none diya-flicker"
        style={{
          width: 36,
          height: 36,
          left: '22%',
          bottom: '2%',
          opacity: 0.82,
          animationDelay: '1.2s',
          shapeRendering: 'geometricPrecision' as any,
          filter: 'drop-shadow(0 1px 6px rgba(249,193,27,0.28))',
        }}
      />
      {/* Diya 4 - bottom right-center */}
      <img
        src="/illustrations/diya.svg"
        alt=""
        draggable={false}
        className="absolute select-none diya-flicker"
        style={{
          width: 40,
          height: 40,
          right: '20%',
          bottom: '2.8%',
          opacity: 0.86,
          animationDelay: '0.35s',
          shapeRendering: 'geometricPrecision' as any,
          filter: 'drop-shadow(0 1px 6px rgba(249,193,27,0.3))',
        }}
      />
    </div>
  )
}
