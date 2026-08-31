'use client'
import { useEffect, useRef, useState } from 'react'
import { PandalLite, predict100Slots, clusterScore, landmarkScore } from '@/lib/crowd'
import { supabase } from '@/lib/supabase/client'

function formatTime(idx: number): string {
  const totalMin = Math.round((idx * 24 * 60) / 100) // 0-1440
  const h = Math.floor(totalMin / 60) % 24
  const m = totalMin % 60
  // snap to 15-min wide intervals for label: 14, 14:15, 14:30, 14:45
  const snapM = Math.round(m / 15) * 15
  const sh = snapM === 60 ? (h + 1) % 24 : h
  const sm = snapM === 60 ? 0 : snapM
  if (sm === 0) return `${sh}`
  return `${sh}:${String(sm).padStart(2, '0')}`
}

export default function CrowdMeter({ pandal }: { pandal: PandalLite }) {
  const [scores, setScores] = useState<number[]>([])
  const [details, setDetails] = useState<{ nearby: number; nearest: string; mallDist: number } | null>(null)
  const [animated, setAnimated] = useState(false)
  const [activeIdx, setActiveIdx] = useState(50) // middle pointer default
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const { data: all } = await supabase.from('pandals').select('id,latitude,longitude,area,avg_rating')
      const allLite = (all as PandalLite[]) || [pandal]
      const s = predict100Slots(pandal, allLite)
      const { nearby } = clusterScore(pandal, allLite)
      const { nearest, mallDist } = landmarkScore(pandal, 18)
      if (!cancelled) {
        setScores(s)
        setDetails({ nearby, nearest, mallDist })
        requestAnimationFrame(() => requestAnimationFrame(() => setAnimated(true)))
        // center scroll to middle (peak area)
        setTimeout(() => {
          if (scrollRef.current) {
            const el = scrollRef.current
            el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2
            setActiveIdx(50)
          }
        }, 100)
      }
    }
    load()
    return () => { cancelled = true }
  }, [pandal])

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const center = el.scrollLeft + el.clientWidth / 2
    const barW = el.scrollWidth / 100
    const idx = Math.min(99, Math.max(0, Math.round(center / barW - 0.5)))
    setActiveIdx(idx)
  }

  const scrollBy = (dx: number) => scrollRef.current?.scrollBy({ left: dx, behavior: 'smooth' })

  // wheel -> horizontal, drag to scroll for PC
  const onWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault()
      if (scrollRef.current) scrollRef.current.scrollLeft += e.deltaY
    }
  }

  if (scores.length === 0) return <div className="mt-4 p-4 rounded-2xl bg-[#020617] border border-[#FFD60A]/10 text-xs text-white/30">Calculating crowd…</div>

  const minScore = Math.min(...scores)
  const maxScore = Math.max(...scores)
  const range = Math.max(1, maxScore - minScore)
  const activeScore = scores[activeIdx]
  const activeTime = formatTime(activeIdx)
  // relative comparison text
  const rel = activeScore === maxScore ? 'Peak of day' : activeScore > maxScore * 0.75 ? 'Higher than most times' : activeScore < minScore + range * 0.25 ? 'Lower than most times' : 'Mid range'

  return (
    <div className="mt-4 bg-[#0B1220] border border-[#FFD60A]/10 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-[#FFD60A]">Crowd Meter — predicted</h3>
        <span className="text-[11px] text-white/30">100 slots • 14.4min • scroll</span>
      </div>
      {details && (
        <p className="text-[11px] text-white/30 mb-2">
          {details.nearby} pandals within 1km • Nearest hub: {details.nearest} ({details.mallDist.toFixed(1)} km)
        </p>
      )}

      {/* highlighted info above pointer */}
      <div className="text-center mb-2">
        <span className="text-xs font-bold text-white">{activeTime}</span>
        <span className="text-[11px] text-white/40 ml-2">{rel}</span>
        <div className="h-1 w-full mt-1 rounded-full bg-gradient-to-r from-[#22c55e] via-[#FFD60A] to-[#FF1A1A] opacity-30" />
      </div>

      <div className="relative">
        {/* PC arrow buttons */}
        <button onClick={() => scrollBy(-120)} className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-[#020617]/80 border border-[#FFD60A]/20 items-center justify-center text-[#FFD60A] hover:bg-[#FFD60A] hover:text-[#020617]">‹</button>
        <button onClick={() => scrollBy(120)} className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-[#020617]/80 border border-[#FFD60A]/20 items-center justify-center text-[#FFD60A] hover:bg-[#FFD60A] hover:text-[#020617]">›</button>
        <div
          ref={scrollRef}
          onScroll={onScroll}
          onWheel={onWheel}
          className="flex items-end gap-0 h-32 px-1 overflow-x-auto scrollbar-hide scroll-smooth cursor-grab active:cursor-grabbing"
          style={{ scrollbarWidth: 'none' }}
        >
          {scores.map((score, i) => {
            // ultra-sensitive: amplify small differences, lunch dip acute
            const norm = (score - minScore) / range
            const sensitive = Math.pow(norm, 0.65) // 0.65 makes mid-low differences pop
            const h = animated ? `${4 + sensitive * 96}%` : '0%'
            const hue = 120 - (score / 100) * 120
            const topColor = `hsl(${hue} 92% 52%)`
            const bg = `linear-gradient(to top, #16a34a 0%, #22c55e 25%, ${topColor} 100%)`
            const isActive = i === activeIdx
            return (
              <div key={i} className="flex-shrink-0 h-full flex items-end" style={{ width: '5px' }}>
                <div
                  className={`w-full transition-all duration-500 ease-out ${isActive ? 'ring-1 ring-white/50 z-10' : ''}`}
                  style={{
                    height: h,
                    background: bg,
                    transitionDelay: `${i * 6}ms`,
                    boxShadow: isActive ? `0 0 8px ${topColor}` : undefined,
                    borderTopLeftRadius: '1px',
                    borderTopRightRadius: '1px',
                  }}
                  title={`${formatTime(i)}`}
                />
              </div>
            )
          })}
        </div>
        {/* scroll pointer at bottom middle */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center">
          <div className="w-0.5 h-32 bg-white/80 rounded-full" />
          <div className="w-2 h-2 bg-white rounded-full -mt-1 shadow" />
          <div className="w-8 h-1 bg-white/20 rounded-full mt-0.5" />
        </div>
      </div>

      <div className="flex justify-between text-[9px] text-white/20 mt-1 px-1 items-center">
        <span>12 AM</span><span>6 AM</span>
        <span className="text-white font-bold bg-[#FFD60A] text-[#020617] px-2 py-0.5 rounded-full">{activeTime}</span>
        <span>6 PM</span><span>12 AM</span>
      </div>
      <p className="text-[10px] text-center text-white/30 mt-1">Scroll (Shift+wheel, drag or arrows) — pointer at middle shows time above</p>

      <div className="mt-2 flex items-center gap-2 text-[10px] text-white/30">
        <span className="flex items-center gap-1"><span className="w-3 h-1 rounded bg-[#22c55e] inline-block" /> Low</span>
        <span className="w-8 h-0.5 bg-gradient-to-r from-[#22c55e] via-[#FFD60A] to-[#FF1A1A] inline-block" />
        <span className="flex items-center gap-1"><span className="w-3 h-1 rounded bg-[#FF1A1A] inline-block" /> Peak</span>
        <span className="ml-auto text-[10px]">Scroll to explore • lunch dip 12-2pm • mall irregular</span>
      </div>
    </div>
  )
}
