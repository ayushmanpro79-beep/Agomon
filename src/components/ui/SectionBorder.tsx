'use client'
// Custom yellow scandi border - drawn around each section without overlapping
export default function SectionBorder({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none w-full h-[84px] my-3 opacity-90 select-none ${className}`}
      style={{
        backgroundImage: 'url(/illustrations/scandi-border.svg)',
        backgroundRepeat: 'repeat-x',
        backgroundSize: 'auto 100%',
        backgroundPosition: 'center',
        filter: 'drop-shadow(0 0 4px rgba(255,214,10,0.22))',
        shapeRendering: 'geometricPrecision' as any,
      }}
    />
  )
}

export function SectionFrame({
  children,
  outerClass = '',
  innerClass = '',
}: {
  children: React.ReactNode
  outerClass?: string
  innerClass?: string
}) {
  return (
    <div className={`relative ${outerClass}`}>
      <SectionBorder className="mb-3" />
      <div className={`relative ${innerClass}`}>{children}</div>
      <SectionBorder className="mt-3 rotate-180" />
    </div>
  )
}
