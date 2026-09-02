// src/lib/osm/geocode.ts:1 - OSM Nominatim + Overpass geocoder for Agomon — railway tag filtered
export type GeocodeResult = {
  lat: number
  lon: number
  display_name: string
}

export async function geocodePandal(name: string): Promise<GeocodeResult | null> {
  const query = `${name}, Kolkata, India`
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Agomon/1.0 (agomon.kolkata@gmail.com)',
      'Accept-Language': 'en',
    },
  })
  if (!res.ok) throw new Error(`Nominatim ${res.status}`)
  const data = await res.json()
  if (!data[0]) return null
  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
    display_name: data[0].display_name,
  }
}

// Railway station geocoder — uses tag railway=station|halt (Overpass fallback, then Nominatim class=railway)
export type StationGeocodeResult = { lat: number; lon: number; display_name: string; railway: 'station'|'halt'; source: string }

export async function geocodeStation(name: string): Promise<StationGeocodeResult | null> {
  const viewbox = '88.18,22.80,88.55,22.40'
  // 1) Nominatim with railway class filter — Shahid Khudiram → Noapara, Sealdah/Howrah/Jadavpur etc.
  const urls = [
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name + ' railway station, Kolkata, India')}&format=json&limit=5&addressdetails=1&viewbox=${viewbox}&bounded=0&countrycodes=in`,
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name + ', Kolkata, India')}&format=json&limit=5&addressdetails=1&viewbox=${viewbox}&bounded=0&countrycodes=in`,
  ]
  for (const url of urls) {
    const res = await fetch(url, { headers: { 'User-Agent': 'Agomon/1.0 (agomon.kolkata@gmail.com)', 'Accept-Language': 'en' } })
    if (!res.ok) continue
    const data: any[] = await res.json()
    const hit = data.find(d => d.class === 'railway' && ['station','halt'].includes(d.type))
    if (hit) return { lat: parseFloat(hit.lat), lon: parseFloat(hit.lon), display_name: hit.display_name, railway: hit.type, source: 'nominatim-railway' }
    await new Promise(r => setTimeout(r, 1100))
  }
  // 2) Overpass fallback for railway=station|halt around Kolkata 30km
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const q = `[out:json][timeout:25];(node["railway"~"^(station|halt)$"]["name"~"^${esc}$",i](around:30000,22.5726,88.3639);way["railway"~"^(station|halt)$"]["name"~"^${esc}$",i](around:30000,22.5726,88.3639););out center 1;`
  const overUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`
  try {
    const res = await fetch(overUrl, { headers: { 'User-Agent': 'Agomon/1.0 (agomon.kolkata@gmail.com)' } })
    const json: any = await res.json()
    if (json.elements?.[0]) {
      const el = json.elements.find((e:any)=> e.tags?.railway==='station') || json.elements[0]
      const lat = el.lat ?? el.center?.lat, lon = el.lon ?? el.center?.lon
      if (lat && lon) return { lat, lon, display_name: el.tags?.name || name, railway: el.tags?.railway, source: 'overpass-railway' }
    }
  } catch {}
  return null
}
