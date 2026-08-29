'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { FadeUp, PageTransition, PressButton } from '@/components/ui/Animated'
import PandalMap from '@/components/map/PandalMap'
import Legend from '@/components/map/Legend'
import { metrosWithinKm } from '@/lib/geo'

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

// src/app/pandal/[slug]/page.tsx:16 - pandal-specific map: Deepak, metro 1km, legends, recentre + OSRM route
export default function PandalDetail() {
  const { slug } = useParams<{ slug: string }>()
  const [pandal, setPandal] = useState<Pandal | null>(null)
  const [loading, setLoading] = useState(true)
  const [userLoc, setUserLoc] = useState<{ lat: number; lon: number } | null>(null)
  const [routeGeoJson, setRouteGeoJson] = useState<any | null>(null)
  const [routeInfo, setRouteInfo] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('pandals').select('*').eq('slug', slug).single().then(({ data }) => {
      setPandal(data as Pandal)
      setLoading(false)
    })
  }, [slug])

  // get user location + fetch OSRM route when pandal loads
  useEffect(() => {
    if (!pandal?.latitude || !pandal?.longitude) return
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const u = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        setUserLoc(u)
        try {
          const url = `https://router.project-osrm.org/route/v1/foot/${u.lon},${u.lat};${pandal.longitude},${pandal.latitude}?overview=full&geometries=geojson`
          const res = await fetch(url)
          const json = await res.json()
          if (json.routes?.[0]) {
            setRouteGeoJson({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: json.routes[0].geometry, properties: {} }] })
            const dist = (json.routes[0].distance / 1000).toFixed(1)
            const dur = Math.round(json.routes[0].duration / 60)
            setRouteInfo(`${dist} km • ${dur} min walk`)
          }
        } catch {}
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }, [pandal])

  if (loading) return <div className="py-20 text-center text-white/30 text-sm">Loading...</div>
  if (!pandal) return <div className="py-20 text-center"><p className="text-white/50">Not found</p><Link href="/" className="text-[#FFD60A] underline text-sm">Back</Link></div>

  const rating = pandal.avg_rating ?? 4.5
  const hasImage = !!pandal.image_url
  const metros = pandal.latitude && pandal.longitude ? metrosWithinKm({ latitude: pandal.latitude, longitude: pandal.longitude }, 1) : []
  const metrosToShow = metros.map((m) => ({ id: m.id, name: m.name, lat: m.lat, lon: m.lon }))

  return (
    <PageTransition>
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-white/40 mb-3">← Back</Link>

      <FadeUp>
        <div className="bg-[#0B1220] rounded-2xl overflow-hidden border border-[#FFD60A]/10">
          <div className="h-56 md:h-64 bg-[#020617] flex items-center justify-center relative border-b border-[#FFD60A]/5">
            {hasImage ? (
              <img src={pandal.image_url!} alt={pandal.name} className="w-full h-full object-cover" />
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

            <div className="flex items-center gap-3 mt-3 p-3 bg-[#020617] rounded-xl border border-[#FFD60A]/10">
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
                <div className="mt-3"><Legend metros={metros} /></div>
                {routeGeoJson && <p className="text-xs text-[#FF7A00]/70 mt-2">Orange route uses small gully + footpaths if shorter (OSRM foot profile, not just main roads)</p>}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link href="/map" className="bg-[#0B1220] border border-[#FFD60A]/20 text-[#FFD60A] rounded-xl py-2.5 text-sm font-medium text-center">View in Browse Map</Link>
                  <PressButton className="bg-[#FFD60A] text-[#020617] rounded-xl py-2.5 text-sm font-semibold" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${pandal.latitude},${pandal.longitude}&travelmode=walking`, '_blank')}>
                    Start in Google Maps
                  </PressButton>
                </div>
                <p className="text-[11px] text-white/20 mt-2 text-center">Click card → map recentres + zooms out + yellow walking route from your location • OSM in-website • Start opens Google Maps</p>
              </div>
            )}
          </div>
        </div>
      </FadeUp>
    </PageTransition>
  )
}
