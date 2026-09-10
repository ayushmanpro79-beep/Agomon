// src/lib/geo.ts:1 - haversine distance + metro helpers — OSM railway=station|halt verified (Nominatim class=railway type=station)
// Geocoded via scripts/geocode-stations.mjs — Shahid Khudiram → Noapara + locals, tag railway=station|halt
export function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLon = ((b.lon - a.lon) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

export type Metro = { id: string; name: string; lat: number; lon: number; line: string }

export const KOLKATA_METROS: Metro[] = [
  // Line 1 South → North — OSM railway=station verified via Nominatim (class=railway type=station)
  { id: 'kavi-subhash', name: 'Kavi Subhash', lat: 22.4720556, lon: 88.3979434, line: 'Line 1' },
  { id: 'shahid-khudiram', name: 'Shahid Khudiram', lat: 22.4659847, lon: 88.3915408, line: 'Line 1' },
  { id: 'kavi-nazrul', name: 'Kavi Nazrul', lat: 22.4642505, lon: 88.3804604, line: 'Line 1' },
  { id: 'gitanjali', name: 'Gitanjali', lat: 22.4694673, lon: 88.3700115, line: 'Line 1' },
  { id: 'masterda-surya-sen', name: 'Masterda Surya Sen', lat: 22.4735865, lon: 88.3606732, line: 'Line 1' },
  { id: 'netaji', name: 'Netaji', lat: 22.4809928, lon: 88.3460002, line: 'Line 1' },
  { id: 'mahanayak-uttam', name: 'Mahanayak Uttam Kumar', lat: 22.4947692, lon: 88.3450879, line: 'Line 1' },
  { id: 'rabindra-sarobar', name: 'Rabindra Sarobar', lat: 22.5072216, lon: 88.3454936, line: 'Line 1' },
  { id: 'kalighat', name: 'Kalighat', lat: 22.5168752, lon: 88.3458448, line: 'Line 1' },
  { id: 'jatin-das-park', name: 'Jatin Das Park', lat: 22.5241535, lon: 88.3464729, line: 'Line 1' },
  { id: 'netaji-bhavan', name: 'Netaji Bhavan', lat: 22.5331821, lon: 88.3459269, line: 'Line 1' },
  { id: 'rabindra-sadan', name: 'Rabindra Sadan', lat: 22.5414899, lon: 88.3473493, line: 'Line 1' },
  { id: 'maidan', name: 'Maidan', lat: 22.5494672, lon: 88.3487883, line: 'Line 1' },
  { id: 'park-street', name: 'Park Street', lat: 22.5551591, lon: 88.3501171, line: 'Line 1' },
  { id: 'esplanade', name: 'Esplanade', lat: 22.5641292, lon: 88.3502752, line: 'Line 1' },
  { id: 'chandni-chowk', name: 'Chandni Chowk', lat: 22.5670118, lon: 88.3541581, line: 'Line 1' },
  { id: 'central', name: 'Central', lat: 22.5724857, lon: 88.3587427, line: 'Line 1' },
  { id: 'm-g-road', name: 'Mahatma Gandhi Road', lat: 22.5809206, lon: 88.3613271, line: 'Line 1' },
  { id: 'girish-park', name: 'Girish Park', lat: 22.5871445, lon: 88.3629415, line: 'Line 1' },
  { id: 'sovabazar', name: 'Sovabazar Sutanuti', lat: 22.595881, lon: 88.3651996, line: 'Line 1' },
  { id: 'shyambazar', name: 'Shyambazar', lat: 22.601335, lon: 88.3724974, line: 'Line 1' },
  { id: 'belgachia', name: 'Belgachia', lat: 22.6059241, lon: 88.3863913, line: 'Line 1' },
  { id: 'dum-dum', name: 'Dum Dum', lat: 22.6211141, lon: 88.3928973, line: 'Line 1' },
  { id: 'noapara', name: 'Noapara', lat: 22.6398418, lon: 88.3941343, line: 'Line 1' },
  { id: 'baranagar', name: 'Baranagar', lat: 22.6530765, lon: 88.3805962, line: 'Line 1' },
  { id: 'dakshineswar', name: 'Dakshineswar', lat: 22.653, lon: 88.365, line: 'Line 1' }, // fallback — OSM railway station not found (nominatim no railway class), kept approximate
  // Line 2 East-West
  { id: 'salt-lake-sector-v', name: 'Salt Lake Sector V', lat: 22.579, lon: 88.428, line: 'Line 2' },
  { id: 'karunamoyee', name: 'Karunamoyee', lat: 22.582, lon: 88.414, line: 'Line 2' },
  { id: 'central-park', name: 'Central Park', lat: 22.586, lon: 88.405, line: 'Line 2' },
]

export function metrosWithinKm(pandal: { latitude: number; longitude: number }, radiusKm = 2.2): Metro[] {
  return KOLKATA_METROS.filter((m) => haversineKm({ lat: pandal.latitude, lon: pandal.longitude }, { lat: m.lat, lon: m.lon }) <= radiusKm)
}

export function topSharedMetros(pandals: { latitude: number; longitude: number }[], max = 3): Metro[] {
  const scored = KOLKATA_METROS.map((m) => ({
    metro: m,
    count: pandals.filter((p) => haversineKm({ lat: p.latitude, lon: p.longitude }, { lat: m.lat, lon: m.lon }) <= 2.2).length,
  }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, max)
    .map((s) => s.metro)
  return scored
}
