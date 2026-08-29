'use client'

import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { KOLKATA_METROS, haversineKm } from '@/lib/geo'

type Pandal = {
  id: string
  name: string
  slug: string
  area: string
  latitude: number | null
  longitude: number | null
}

type Mode = 'browse' | 'detail'

type Props = {
  pandals: Pandal[]
  mode?: Mode
  highlightedSlug?: string | null
  userLocation?: { lat: number; lon: number } | null
  routeGeoJson?: any | null
  onPandalClick?: (slug: string) => void
  onMetroClick?: (metroId: string) => void
  metrosToShow?: { id: string; name: string; lat: number; lon: number }[]
}

// src/components/map/PandalMap.tsx:30 - OSM light (no watermark), Deepak pandal pins, metro pins, route
export default function PandalMap({ pandals, mode = 'browse', highlightedSlug, userLocation, routeGeoJson, onPandalClick, onMetroClick, metrosToShow }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<maplibregl.Map | null>(null)
  const routeAdded = useRef(false)

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
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
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

  // markers
  useEffect(() => {
    const map = mapInstance.current
    if (!map) return
    document.querySelectorAll('.agomon-marker,.agomon-metro,.agomon-user').forEach((el) => el.remove())

    // pandals → Deepak logo (yellow)
    pandals.forEach((p) => {
      if (p.latitude == null || p.longitude == null) return
      const isHighlighted = highlightedSlug === p.slug
      const el = document.createElement('div')
      el.className = 'agomon-marker'
      el.style.width = isHighlighted ? '28px' : '22px'
      el.style.height = isHighlighted ? '28px' : '22px'
      el.style.borderRadius = '50%'
      el.style.background = '#FFD60A'
      el.style.border = '2.5px solid #020617'
      el.style.display = 'flex'
      el.style.alignItems = 'center'
      el.style.justifyContent = 'center'
      el.style.fontSize = isHighlighted ? '14px' : '11px'
      el.style.cursor = 'pointer'
      el.style.boxShadow = isHighlighted ? '0 0 14px rgba(255,214,10,0.9)' : '0 0 8px rgba(255,214,10,0.55)'
      el.style.zIndex = isHighlighted ? '10' : '1'
      el.innerHTML = '🪔'
      el.title = p.name + ' — click to view'
      el.onclick = () => onPandalClick?.(p.slug)
      new maplibregl.Marker({ element: el }).setLngLat([p.longitude!, p.latitude!]).addTo(map)
    })

    // metros
    const metros = metrosToShow ?? []
    metros.forEach((m) => {
      const el = document.createElement('div')
      el.className = 'agomon-metro'
      el.style.width = '22px'
      el.style.height = '22px'
      el.style.borderRadius = '6px'
      el.style.background = '#0B1220'
      el.style.border = '1.5px solid #FFD60A'
      el.style.color = '#FFD60A'
      el.style.display = 'flex'
      el.style.alignItems = 'center'
      el.style.justifyContent = 'center'
      el.style.fontSize = '11px'
      el.style.fontWeight = '700'
      el.style.cursor = 'pointer'
      el.style.boxShadow = '0 0 6px rgba(255,214,10,0.4)'
      el.innerHTML = 'M'
      el.title = m.name + ' — click to see nearby pandals (1km)'
      el.onclick = () => onMetroClick?.(m.id)
      new maplibregl.Marker({ element: el }).setLngLat([m.lon, m.lat]).addTo(map)
    })

    // user location
    if (userLocation) {
      const el = document.createElement('div')
      el.className = 'agomon-user'
      el.style.width = '14px'
      el.style.height = '14px'
      el.style.borderRadius = '50%'
      el.style.background = '#3B82F6'
      el.style.border = '2.5px solid white'
      el.style.boxShadow = '0 0 8px rgba(59,130,246,0.8)'
      new maplibregl.Marker({ element: el }).setLngLat([userLocation.lon, userLocation.lat]).addTo(map)
    }
  }, [pandals, highlightedSlug, userLocation, metrosToShow, onPandalClick, onMetroClick])

  // recentre on highlighted pandal (pandal page: click card → zoom out + centre)
  useEffect(() => {
    const map = mapInstance.current
    if (!map || !highlightedSlug || mode !== 'detail') return
    const p = pandals.find((x) => x.slug === highlightedSlug)
    if (!p?.latitude || !p?.longitude) return
    map.flyTo({ center: [p.longitude!, p.latitude!], zoom: 14, duration: 900 })
  }, [highlightedSlug, pandals, mode])

  // route polyline (yellow)
  useEffect(() => {
    const map = mapInstance.current
    if (!map) return
    const doRoute = () => {
      if (routeGeoJson) {
        if (map.getSource('route')) {
          ;(map.getSource('route') as maplibregl.GeoJSONSource).setData(routeGeoJson)
        } else {
          map.addSource('route', { type: 'geojson', data: routeGeoJson })
          map.addLayer({ id: 'route', type: 'line', source: 'route', paint: { 'line-color': '#FF7A00', 'line-width': 5, 'line-opacity': 0.9, 'line-blur': 0.5 } })
        }
        routeAdded.current = true
        // fit bounds to route
        try {
          const coords = routeGeoJson.features[0].geometry.coordinates as [number, number][]
          const bounds = coords.reduce((b: maplibregl.LngLatBounds, c) => b.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]))
          map.fitBounds(bounds, { padding: 60, duration: 800 })
        } catch {}
      } else if (routeAdded.current && map.getLayer('route')) {
        map.removeLayer('route')
        map.removeSource('route')
        routeAdded.current = false
      }
    }
    if (map.isStyleLoaded()) doRoute()
    else map.once('load', doRoute)
  }, [routeGeoJson])

  return <div ref={mapRef} className="w-full h-[60vh] rounded-xl overflow-hidden border border-[#FFD60A]/10 bg-[#0B1220]" />
}
