'use client'
import { useEffect, useState } from 'react'
import { PandalLite, predict48Slots, clusterScore, landmarkScore } from '@/lib/crowd'
import { supabase } from '@/lib/supabase/client'

export default function CrowdMeter({ pandal }: { pandal: PandalLite }) {
  const [scores, setScores] = useState<number[]>([])
  const [details, setDetails] = useState<{ nearby: number; nearest: string; mallDist: number } | null>(null)
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const { data: all } = await supabase.from('pandals').select('id,latitude,longitude,area,avg_rating')
      const allLite = (all as PandalLite[]) || [pandal]
      const s = predict48Slots(pandal, allLite)
      const { nearby } = clusterScore(pandal, allLite)
      const { nearest, mallDist } = landmarkScore(pandal, 18)
      if (!cancelled) {
        setScores(s)
        setDetails({ nearby, nearest, mallDist })
        requestAnimationFrame(() => requestAnimationFrame(() => setAnimated(true)))
      }
    }
    load()
    return () => { cancelled = true }
  }, [pandal])

  if (scores.length === 0) return <div className="mt-4 p-4 rounded-2xl bg-[#020617] border border-[#FFD60A]/10 text-xs text-white/30">Calculating crowd…</div>

  const minScore = Math.min(...scores)
  const maxScore = Math.max(...scores)
  const range = Math.max(1, maxScore - minScore)

  return (
    <div className="mt-4 bg-[#0B1220] border border-[#FFD60A]/10 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-[#FFD60A]">Crowd Meter — predicted</h3>
        <span className="text-[11px] text-white/30">48 slots • 30 min</span>
      </div>
      {details && (
        <p className="text-[11px] text-white/30 mb-3">
          {details.nearby} pandals within 1km • Nearest hub: {details.nearest} ({details.mallDist.toFixed(1)} km) • Peak 5-8 PM • Lunch dip 12-2
        </p>
      )}

      <div className="flex items-end gap-[1px] h-28 px-1">
        {scores.map((score, i) => {
          const norm = (score - minScore) / range
          const sensitive = Math.pow(norm, 0.65)
          const h = animated ? `${4 + sensitive * 96}%` : '0%'
          const hue = 120 - (score / 100) * 120
          const topColor = `hsl(${hue} 92% 52%)`
          const bg = `linear-gradient(to top, #16a34a 0%, #22c55e 25%, ${topColor} 100%)`
          const isPeak = score === maxScore
          return (
            <div key={i} className="flex-1 h-full flex items-end">
              <div
                className={`w-full transition-all duration-500 ease-out ${isPeak ? 'ring-1 ring-white/20' : ''}`}
                style={{
                  height: h,
                  background: bg,
                  transitionDelay: `${i * 12}ms`,
                  boxShadow: isPeak ? `0 0 6px ${topColor}` : undefined,
                  borderTopLeftRadius: '1px',
                  borderTopRightRadius: '1px',
                }}
                title={`${String(Math.floor(i * 0.5)).padStart(2,'0')}:${i % 2 === 0 ? '00' : '30'} • ${score}%`}
              />
            </div>
          )
        })}
      </div>

      <div className="flex justify-between text-[9px] text-white/20 mt-1 px-1">
        <span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>12 AM</span>
      </div>

      <div className="mt-2 flex items-center gap-2 text-[10px] text-white/30">
        <span className="flex items-center gap-1"><span className="w-3 h-1 rounded bg-[#22c55e] inline-block" /> Low</span>
        <span className="w-8 h-0.5 bg-gradient-to-r from-[#22c55e] via-[#FFD60A] to-[#FF1A1A] inline-block" />
        <span className="flex items-center gap-1"><span className="w-3 h-1 rounded bg-[#FF1A1A] inline-block" /> Peak</span>
        <span className="ml-auto">48 × 30 min • dip 12-2 • mall irregular • animation</span>
      </div>
    </div>
  )
}
