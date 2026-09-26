'use client'
import { PandalLite, landmarkScore } from '@/lib/crowd'
import { haversineKm } from '@/lib/geo'

const LANDMARKS = [
  { name: 'South City Mall', lat: 22.501, lon: 88.346, type: 'Mall' },
  { name: 'Acropolis Mall', lat: 22.515, lon: 88.391, type: 'Mall' },
  { name: 'Quest Mall', lat: 22.544, lon: 88.351, type: 'Mall' },
  { name: 'City Centre Salt Lake', lat: 22.589, lon: 88.407, type: 'Mall' },
  { name: 'Mani Square', lat: 22.596, lon: 88.4, type: 'Mall' },
  { name: 'New Market', lat: 22.56, lon: 88.351, type: 'Market' },
  { name: 'Park Street Eateries', lat: 22.555, lon: 88.352, type: 'Eatery Hub' },
  { name: 'Gariahat Market', lat: 22.515, lon: 88.363, type: 'Market' },
  { name: 'Hatibagan Market', lat: 22.6, lon: 88.374, type: 'Market' },
  { name: 'Esplanade', lat: 22.562, lon: 88.352, type: 'Transit Hub' },
  { name: 'Sector V', lat: 22.579, lon: 88.428, type: 'Office Hub' },
  { name: 'Eco Park', lat: 22.605, lon: 88.433, type: 'Park' },
  { name: 'Lake Gardens', lat: 22.507, lon: 88.344, type: 'Lake' },
  { name: 'Princep Ghat', lat: 22.558, lon: 88.341, type: 'Tourist' },
  { name: 'Science City', lat: 22.54, lon: 88.396, type: 'Tourist' },
]

export default function LandmarkList({ pandal }: { pandal: PandalLite }) {
  if (!pandal.latitude || !pandal.longitude) return null
  const sorted = LANDMARKS.map(l => ({
    ...l,
    dist: haversineKm({ lat: pandal.latitude!, lon: pandal.longitude! }, { lat: l.lat, lon: l.lon }),
  }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 5)

  return (
    <div className="mt-4 glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-white tracking-tight">Top 5 places nearby</h3>
        <span className="chip-minimal px-2 py-1 text-white/40">2.2 km</span>
      </div>
      <p className="text-[11px] text-white/30 mb-3">Malls, markets, eateries and hubs around this pandal</p>
      <div className="space-y-2">
        {sorted.map((l, i) => (
          <div key={l.name} className="card-lift flex items-center gap-3 p-2.5 rounded-xl glass border border-[#FFD60A]/5">
            <span className="w-6 h-6 rounded-full bg-[#FFD60A]/10 border border-[#FFD60A]/20 flex items-center justify-center text-[11px] font-bold text-[#FFD60A]">{i + 1}</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-white leading-none">{l.name}</p>
              <p className="text-[11px] text-white/40">{l.type} • {l.dist.toFixed(1)} km away</p>
            </div>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lon}&travelmode=walking`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] bg-[#FFD60A] hover:bg-[#FFE566] text-[#020617] font-semibold rounded-full px-3.5 py-2 shrink-0 min-h-[36px] inline-flex items-center transition hover:shadow-[0_0_14px_rgba(255,214,10,0.4)] active:scale-90"
            >
              Maps <span aria-hidden>→</span>
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
