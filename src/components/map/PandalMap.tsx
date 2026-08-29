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

// src/components/map/PandalMap.tsx:12 - OSM via MapLibre raster
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
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: [88.3639, 22.5726], // Kolkata
      zoom: 11,
    })

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right')
    map.addControl(new maplibregl.GeolocateControl({ trackUserLocation: true }), 'bottom-right')

    mapInstance.current = map

    return () => {
      map.remove()
      mapInstance.current = null
    }
  }, [])

  // add markers when pandals load
  useEffect(() => {
    const map = mapInstance.current
    if (!map) return

    // clear old markers (simple: remove all .agomon-marker)
    document.querySelectorAll('.agomon-marker').forEach((el) => el.remove())

    pandals.forEach((p) => {
      if (p.latitude == null || p.longitude == null) return
      const el = document.createElement('div')
      el.className = 'agomon-marker'
      el.style.width = '28px'
      el.style.height = '28px'
      el.style.borderRadius = '50%'
      el.style.background = '#B45309'
      el.style.border = '2px solid white'
      el.style.display = 'flex'
      el.style.alignItems = 'center'
      el.style.justifyContent = 'center'
      el.style.cursor = 'pointer'
      el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)'
      el.innerHTML = '🪔'
      el.title = p.name
      el.onclick = () => onSelect?.(p.slug)

      new maplibregl.Marker({ element: el }).setLngLat([p.longitude!, p.latitude!]).addTo(map)
    })
  }, [pandals, onSelect])

  return <div ref={mapRef} className="w-full h-[60vh] rounded-xl overflow-hidden border" />
}
