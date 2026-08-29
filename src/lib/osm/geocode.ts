// src/lib/osm/geocode.ts:1 - OSM Nominatim geocoder for Agomon
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
      // Nominatim requires a valid User-Agent
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
