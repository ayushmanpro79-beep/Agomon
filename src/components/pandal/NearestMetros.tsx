'use client'
import Link from 'next/link'
import { metrosWithinKm, haversineKm } from '@/lib/geo'

type Props = {
  latitude: number | null
  longitude: number | null
  userLoc: { lat: number; lon: number } | null
}

// Nearest metros sorted by distance, with Google Maps directions from user's location.
// Rendered beneath Legend, above CrowdMeter on pandal pages.
export default function NearestMetros({ latitude, longitude, userLoc }: Props) {
  if (latitude == null || longitude == null) return null

  const sorted = metrosWithinKm({ latitude, longitude }, 2.2)
    .map((m) => ({
      ...m,
      dist: haversineKm({ lat: latitude, lon: longitude }, { lat: m.lat, lon: m.lon }),
    }))
    .sort((a, b) => a.dist - b.dist)

  const gmaps = (mLat: number, mLon: number) => {
    const base = 'https://www.google.com/maps/dir/?api=1'
    const dest = `&destination=${mLat},${mLon}&travelmode=walking`
    return userLoc ? `${base}&origin=${userLoc.lat},${userLoc.lon}${dest}` : `${base}${dest}`
  }

  return (
    <div className="glass rounded-2xl p-3.5 mt-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-white tracking-tight">Nearest metros</p>
        <span className="chip-minimal px-2 py-1 text-white/40">2.2 km</span>
      </div>
      {sorted.length === 0 && (
        <p className="text-xs text-white/30 mt-2">
          No metro within 2.2 km — <Link href="/travel-plan" className="text-[#FFD60A] underline">check Travel Plan for buses</Link>.
        </p>
      )}
      <div className="grid gap-1.5 mt-2">
        {sorted.map((m, i) => (
          <div key={m.id} className="card-lift flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-[#020617]/60 border border-[#FFD60A]/5">
            <span className="w-6 h-6 rounded bg-[#0B1220] border border-[#FFD60A] flex items-center justify-center text-[10px] font-bold text-[#FFD60A] shrink-0">M</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">
                {i === 0 && <span className="text-[#FFD60A]">★ </span>}{m.name}
              </p>
              <p className="text-[11px] text-white/30">{m.dist.toFixed(1)} km away{m.line ? ` • ${m.line}` : ''}</p>
            </div>
            <a
              href={gmaps(m.lat, m.lon)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-semibold text-[#020617] bg-[#FFD60A] hover:bg-[#FFE566] px-3.5 py-2 rounded-full shrink-0 min-h-[36px] inline-flex items-center transition hover:shadow-[0_0_14px_rgba(255,214,10,0.4)] active:scale-90"
            >
              Directions <span aria-hidden>→</span>
            </a>
          </div>
        ))}
      </div>
      {!userLoc && sorted.length > 0 && (
        <p className="text-[11px] text-white/25 mt-2">Allow location to route from exactly where you stand — otherwise Google Maps starts from your current area.</p>
      )}
    </div>
  )
}
