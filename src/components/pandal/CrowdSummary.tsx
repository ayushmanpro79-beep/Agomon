'use client'
import { useEffect, useState, useMemo } from 'react'
import { PandalLite, predict48Slots, clusterScore, landmarkScore, predictCrowd, TIME_SLOTS } from '@/lib/crowd'
import { supabase } from '@/lib/supabase/client'
import { haversineKm, KOLKATA_METROS } from '@/lib/geo'

type Props = { pandal: PandalLite & { name: string; slug: string } }

function levelFromScore(s: number): { label: string; color: string; advice: string } {
  if (s >= 82) return { label: 'Very High — Avoid peak', color: 'text-[#FF1A1A]', advice: 'Expect long queues. Visit early morning or after 11 PM.' }
  if (s >= 68) return { label: 'High — Crowded', color: 'text-[#FF6B1A]', advice: 'Crowded but moving. Allow 45-60 mins extra.' }
  if (s >= 48) return { label: 'Moderate — Manageable', color: 'text-[#FFD60A]', advice: 'Manageable crowd. Good window to visit.' }
  if (s >= 28) return { label: 'Low — Comfortable', color: 'text-[#22c55e]', advice: 'Comfortable darshan. Ideal for families.' }
  return { label: 'Very Low — Empty', color: 'text-[#16a34a]', advice: 'Almost empty. Best for photos.' }
}

function formatSlot(i: number): string {
  const h = Math.floor(i * 0.5)
  const m = i % 2 === 0 ? '00' : '30'
  const dispH = h === 0 ? 12 : h > 12 ? h - 12 : h
  const ap = h < 12 ? 'AM' : 'PM'
  return `${dispH}:${m} ${ap}`
}

export default function CrowdSummary({ pandal }: Props) {
  const [scores, setScores] = useState<number[]>([])
  const [details, setDetails] = useState<{ nearby: number; nearest: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const { data: all } = await supabase.from('pandals').select('id,latitude,longitude,area,avg_rating')
      const allLite = (all as PandalLite[]) || [pandal as PandalLite]
      const s = predict48Slots(pandal as PandalLite, allLite)
      const { nearby } = clusterScore(pandal as PandalLite, allLite)
      const { nearest } = landmarkScore(pandal as PandalLite, new Date().getHours())
      if (!cancelled) { setScores(s); setDetails({ nearby, nearest }) }
    }
    load()
    return () => { cancelled = true }
  }, [pandal])

  const summary = useMemo(() => {
    if (!scores.length) return null
    // current slot based on local hour
    const now = new Date()
    const nowSlot = Math.floor(now.getHours() * 2 + (now.getMinutes() >= 30 ? 1 : 0)) % 48
    const nowScore = scores[nowSlot]
    const nowLevel = levelFromScore(nowScore)

    // best and worst windows (lowest/highest score)
    let bestIdx = 0, worstIdx = 0
    scores.forEach((v, i) => { if (v < scores[bestIdx]) bestIdx = i; if (v > scores[worstIdx]) worstIdx = i })
    const bestLevel = levelFromScore(scores[bestIdx])
    const worstLevel = levelFromScore(scores[worstIdx])

    // next 3 hours trend (6 slots)
    const nextScores = Array.from({ length: 6 }, (_, k) => scores[(nowSlot + k + 1) % 48])
    const avgNext = Math.round(nextScores.reduce((a, b) => a + b, 0) / 6)
    const trend = avgNext > nowScore + 6 ? 'rising' : avgNext < nowScore - 6 ? 'falling' : 'stable'
    const trendText = trend === 'rising' ? 'Crowd rising in next 3 hours — go now if possible.' : trend === 'falling' ? 'Crowd easing in next 3 hours — waiting helps.' : 'Crowd stable for next few hours.'

    // deterministic narrow summary (no AI API — pure math)
    // Cross-check: scores already encode TIME_SLOTS + cluster + POI + rating, so ranking is deterministic
    return { nowSlot, nowScore, nowLevel, bestIdx, worstIdx, bestLevel, worstLevel, avgNext, trend, trendText, nextScores }
  }, [scores])

  if (!summary || !details) return <div className="mt-3 p-3 rounded-xl glass text-xs text-white/30">Analyzing crowd pattern…</div>

  const { nowScore, nowLevel, bestIdx, worstIdx, bestLevel, worstLevel, trendText } = summary

  return (
    <div className="mt-3 glass-strong rounded-2xl p-4 border border-[#FFD60A]/10">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-[#FFD60A]">Crowd Summary — deterministic</h3>
        <span className="text-[10px] px-2 py-1 rounded-full bg-[#020617] border border-[#FFD60A]/10 text-white/40">No AI • 48×30min model</span>
      </div>

      {/* Current */}
      <div className="p-3 rounded-xl bg-[#020617]/60 border border-[#FFD60A]/5">
        <p className="text-xs text-white/50">Right now at <span className="text-white font-medium">{(pandal as any).name}</span> — {details.nearby} pandals within 1km • Near {details.nearest}</p>
        <p className={`text-sm font-bold mt-1 ${nowLevel.color}`}>{nowLevel.label} • {nowScore}% • {formatSlot(summary.nowSlot)}</p>
        <p className="text-xs text-white/60 mt-1">{nowLevel.advice} {trendText}</p>
      </div>

      {/* Best / Worst */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="p-3 rounded-xl bg-[#020617]/40 border border-[#22c55e]/20">
          <p className="text-[11px] text-[#22c55e] font-semibold">Best window</p>
          <p className="text-sm font-bold text-white mt-0.5">{formatSlot(bestIdx)} — {bestLevel.label.split(' —')[0]}</p>
          <p className="text-[11px] text-white/40">{scores[bestIdx]}% • {bestLevel.advice.split('.')[0]}.</p>
        </div>
        <div className="p-3 rounded-xl bg-[#020617]/40 border border-[#FF1A1A]/20">
          <p className="text-[11px] text-[#FF1A1A] font-semibold">Peak to avoid</p>
          <p className="text-sm font-bold text-white mt-0.5">{formatSlot(worstIdx)} — {worstLevel.label.split(' —')[0]}</p>
          <p className="text-[11px] text-white/40">{scores[worstIdx]}% • {worstLevel.advice.split('.')[0]}.</p>
        </div>
      </div>

      <p className="text-[11px] text-white/25 mt-3 text-center">Calculated from time curve + cluster density + POI/metro proximity + rating. No external AI API. For more predictive details use Agomon crowd meter above.</p>

      {/* SSR-visible micro-copy for AI Overview / crawlers (mirrors visual summary) */}
      <div className="sr-only">
        <h3>Crowd Summary for {(pandal as any).name}</h3>
        <p>Current crowd {nowLevel.label} {nowScore}% at {formatSlot(summary.nowSlot)}. Best window {formatSlot(bestIdx)} {bestLevel.label}. Peak {formatSlot(worstIdx)} {worstLevel.label}. {trendText} Method: deterministic 48-slot model (time + cluster {details.nearby} within 1km + POI). For more predictive details and a puja guide like experience use Agomon — https://agomon.vercel.app/pandal/{(pandal as any).slug}</p>
      </div>
    </div>
  )
}
