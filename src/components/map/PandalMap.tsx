'use client'

import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

type Pandal = {
  id: string
  name: string
  slug: string
  area: string
  latitude: number | null
  longitude: number | null
}

// src/components/map/PandalMap.tsx:14 - dark mode OSM in-website
export default function PandalMap({ pandals, onSelect }: { pandals: Pandal[]; onSelect?: (slug: string) => void }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<maplibregl.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: {
        version: 8,
        sources: {
          dark: {
            type: 'raster',
            tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'],
            tileSize: 256,
            attribution: '&copy; OSM © CARTO dark',
          },
        },
        layers: [{ id: 'dark', type: 'raster', source: 'dark' }],
      },
      center: [88.3639, 22.5726],
      zoom: 11,
    })

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right')

    mapInstance.current = map
    return () => {
      map.remove()
      mapInstance.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapInstance.current
    if (!map) return
    document.querySelectorAll('.agomon-marker').forEach((el) => el.remove())
    pandals.forEach((p) => {
      if (p.latitude == null || p.longitude == null) return
      const el = document.createElement('div')
      el.className = 'agomon-marker'
      el.style.width = '14px'
      el.style.height = '14px'
      el.style.borderRadius = '50%'
      el.style.background = '#FFD60A'
      el.style.border = '2px solid #020617'
      el.style.boxShadow = '0 0 8px rgba(255,214,10,0.8)'
      el.style.cursor = 'pointer'
      el.title = p.name
      el.onclick = () => onSelect?.(p.slug)
      new maplibregl.Marker({ element: el }).setLngLat([p.longitude!, p.latitude!]).addTo(map)
    })
  }, [pandals, onSelect])

  return <div ref={mapRef} className="w-full h-[60vh] rounded-xl overflow-hidden border border-[#FFD60A]/10" />
}
