'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FadeUp, PageTransition, PressButton } from '@/components/ui/Animated'
import PandalMap from '@/components/map/PandalMap'
import Legend from '@/components/map/Legend'
import { metrosWithinKm, haversineKm } from '@/lib/geo'
import SectionBorder from '@/components/ui/SectionBorder'
import ReviewSection from '@/components/pandal/ReviewSection'
import CrowdMeter from '@/components/pandal/CrowdMeter'
import CrowdSummary from '@/components/pandal/CrowdSummary'
import LandmarkList from '@/components/pandal/LandmarkList'

type Pandal = {
  id: string
  name: string
  slug: string
  area: string
  address: string | null
  latitude: number | null
  longitude: number | null
  image_url?: string | null
  avg_rating?: number | null
  rating_count?: number | null
}

export default function PandalDetailClient({ pandal }: { pandal: Pandal }) {
  const [userLoc, setUserLoc] = useState<{ lat: number; lon: number } | null>(null)
  const [routeGeoJson, setRouteGeoJson] = useState<any | null>(null)
  const [routeInfo, setRouteInfo] = useState<string | null>(null)

  useEffect(() => {
    if (!pandal?.latitude || !pandal?.longitude) return
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const u = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        setUserLoc(u)
        try {
          const straightKm = haversineKm({ lat: u.lat, lon: u.lon }, { lat: pandal.latitude!, lon: pandal.longitude! })
          const profile = straightKm > 8 ? 'driving' : 'foot'
          const url = `https://router.project-osrm.org/route/v1/${profile}/${u.lon},${u.lat};${pandal.longitude},${pandal.latitude}?overview=full&geometries=geojson`
          const res = await fetch(url)
          const json = await res.json()
          if (json.routes?.[0]) {
            setRouteGeoJson({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: json.routes[0].geometry, properties: {} }] })
            const dist = (json.routes[0].distance / 1000).toFixed(1)
            const isFoot = profile === 'foot'
            const dur = isFoot ? Math.round(json.routes[0].distance / 1.4 / 60) : Math.round(json.routes[0].duration / 60)
            setRouteInfo(`${dist} km • ${dur} min ${isFoot ? 'walk' : 'drive'}`)
          }
        } catch {}
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }, [pandal])

  const rating = pandal.avg_rating ?? 4.5
  const hasImage = !!pandal.image_url
  const metros = pandal.latitude && pandal.longitude ? metrosWithinKm({ latitude: pandal.latitude, longitude: pandal.longitude }, 2.2) : []
  const metrosToShow = metros.map((m) => ({ id: m.id, name: m.name, lat: m.lat, lon: m.lon }))

  return (
    <PageTransition>
      <Link href="/browse" className="inline-flex items-center gap-1 text-sm text-white/40 mb-3">← Back to Browse</Link>
      <FadeUp>
        <SectionBorder />
        <div className="glass rounded-2xl overflow-hidden">
          <div className="h-56 md:h-64 bg-[#020617]/60 flex items-center justify-center relative border-b border-[#FFD60A]/10">
            {hasImage ? (
              <img src={pandal.image_url!} alt={`${pandal.name} Durga Puja pandal in ${pandal.area} 2026`} className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-6">
                <div className="w-12 h-12 mx-auto rounded-xl bg-[#FFD60A]/10 border border-[#FFD60A]/20 flex items-center justify-center text-[#FFD60A]">◆</div>
                <p className="text-sm text-white/60 mt-3">{pandal.name}</p>
                <p className="text-xs text-white/20 mt-1">Image field ready</p>
                <p className="text-[11px] text-white/20 mt-2 font-mono">{pandal.slug}</p>
              </div>
            )}
            <span className="absolute top-3 left-3 text-xs bg-[#020617] border border-[#FFD60A]/20 px-2.5 py-1 rounded-full text-[#FFD60A]/80">{pandal.area}</span>
          </div>
          <div className="p-4">
            <h1 className="text-xl font-bold text-white">{pandal.name}</h1>
            <p className="text-sm text-white/40 mt-1">{pandal.address || pandal.area + ', Kolkata'}</p>
            <div className="flex items-center gap-3 mt-3 p-3 glass rounded-xl">
              <div className="text-center">
                <p className="text-2xl font-bold text-[#FFD60A]">{rating.toFixed(1)}</p>
                <p className="text-[10px] text-white/30">Rating</p>
              </div>
              <div className="flex-1 border-l border-[#FFD60A]/10 pl-3">
                <div className="flex text-[#FFD60A] text-sm">{'★'.repeat(Math.round(rating))}<span className="text-white/15">{'★'.repeat(5 - Math.round(rating))}</span><span className="ml-2 text-xs text-white/50">{rating.toFixed(1)} / 5</span></div>
                <p className="text-xs text-white/30 mt-1">{pandal.rating_count ?? 0} ratings</p>
              </div>
            </div>
            {pandal.latitude && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-[#FFD60A]/80 mb-2">Pandal Map — in-website (OSM light) {routeInfo && <span className="text-white/40 font-normal">• {routeInfo}</span>}</p>
                <PandalMap pandals={[pandal]} mode="detail" highlightedSlug={pandal.slug} userLocation={userLoc} routeGeoJson={routeGeoJson} metrosToShow={metrosToShow} />
                <div className="mt-3"><Legend metros={metros} showRoute={!!routeGeoJson} showUser={!!userLoc} /></div>
                {routeGeoJson && <p className="text-xs text-[#FF1A1A]/70 mt-2">Red line is your in-site route (OSRM {routeInfo?.includes('walk') ? 'foot' : 'driving'} profile)</p>}
                <CrowdMeter pandal={pandal} />
                <CrowdSummary pandal={pandal as any} />
                <LandmarkList pandal={pandal} />
                <ReviewSection pandalId={pandal.id} />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link href="/browse" className="bg-[#0B1220] border border-[#FFD60A]/20 text-[#FFD60A] rounded-xl py-2.5 text-sm font-medium text-center">View in Browse Map</Link>
                  <PressButton className="bg-[#FFD60A] text-[#020617] rounded-xl py-2.5 text-sm font-semibold" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${pandal.latitude},${pandal.longitude}&travelmode=${routeInfo?.includes('drive') ? 'driving' : 'walking'}`, '_blank')}>
                    Start in Google Maps
                  </PressButton>
                </div>
                <p className="text-[11px] text-white/20 mt-2 text-center">In-site red route • OSM in-website • Start opens Google Maps</p>
              </div>
            )}
          </div>
        </div>
        <SectionBorder className="mt-3 rotate-180" />
      </FadeUp>
    </PageTransition>
  )
}
