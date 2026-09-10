'use client'

import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { getMapMode, VECTOR_STYLE, RASTER_STYLE } from '@/lib/mapConfig'

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

// src/components/map/PandalMap.tsx:30 - Step 1 raster + Step 2 vector switch, routing works on both
export default function PandalMap({ pandals, mode = 'browse', highlightedSlug, userLocation, routeGeoJson, onPandalClick, onMetroClick, metrosToShow }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<maplibregl.Map | null>(null)
  const routeAdded = useRef(false)

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return
    const mode = getMapMode()
    const style: any = mode === 'vector' ? VECTOR_STYLE : RASTER_STYLE
    const map = new maplibregl.Map({
      container: mapRef.current,
      style,
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

  // markers + user dot
  useEffect(() => {
    const map = mapInstance.current
    if (!map) return
    const addMarkers = () => {
      document.querySelectorAll('.agomon-marker,.agomon-metro,.agomon-user').forEach((el) => el.remove())
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
        el.innerHTML = '🪔'
        el.title = p.name
        el.onclick = () => onPandalClick?.(p.slug)
        new maplibregl.Marker({ element: el }).setLngLat([p.longitude!, p.latitude!]).addTo(map)
      })
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
        el.innerHTML = 'M'
        el.title = m.name
        el.onclick = () => onMetroClick?.(m.id)
        new maplibregl.Marker({ element: el }).setLngLat([m.lon, m.lat]).addTo(map)
      })
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
    }
    if (map.isStyleLoaded()) addMarkers()
    else map.once('load', addMarkers)
  }, [pandals, highlightedSlug, metrosToShow, onPandalClick, onMetroClick, userLocation])

  // recentre on highlighted pandal - skip if route will fitBounds
  useEffect(() => {
    const map = mapInstance.current
    if (!map || !highlightedSlug || mode !== 'detail' || routeGeoJson) return
    const p = pandals.find((x) => x.slug === highlightedSlug)
    if (!p?.latitude || !p?.longitude) return
    map.flyTo({ center: [p.longitude!, p.latitude!], zoom: 14, duration: 900 })
  }, [highlightedSlug, pandals, mode, routeGeoJson])

  // Step 1 raster routing - red line 10px + white casing, works on PNG and later vector
  useEffect(() => {
    const map = mapInstance.current
    if (!map) return
    const doRoute = () => {
      if (routeGeoJson) {
        try {
          if (map.getSource('route')) {
            ;(map.getSource('route') as maplibregl.GeoJSONSource).setData(routeGeoJson)
          } else {
            map.addSource('route', { type: 'geojson', data: routeGeoJson })
            map.addLayer({ id: 'route-casing', type: 'line', source: 'route', paint: { 'line-color': '#ffffff', 'line-width': 14, 'line-opacity': 1 } as any })
            map.addLayer({ id: 'route', type: 'line', source: 'route', paint: { 'line-color': '#FF1A1A', 'line-width': 10, 'line-opacity': 1 } as any, layout: { 'line-join': 'round', 'line-cap': 'round' } as any })
          }
          routeAdded.current = true
          map.triggerRepaint()
          const coords = routeGeoJson.features[0].geometry.coordinates as [number, number][]
          const bounds = coords.reduce((b: maplibregl.LngLatBounds, c) => b.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]))
          map.fitBounds(bounds, { padding: 40, duration: 800 })
          setTimeout(() => map.triggerRepaint(), 500)
        } catch {}
      } else if (routeAdded.current) {
        if (map.getLayer('route')) map.removeLayer('route')
        if (map.getLayer('route-casing')) map.removeLayer('route-casing')
        if (map.getSource('route')) map.removeSource('route')
        routeAdded.current = false
      }
    }
    if (map.isStyleLoaded()) doRoute()
    else map.once('load', doRoute)
  }, [routeGeoJson])

  return <div ref={mapRef} className="w-full h-[60vh] rounded-xl overflow-hidden border border-[#FFD60A]/10 bg-[#0B1220]" />
}
