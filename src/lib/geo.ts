// src/lib/geo.ts:1 - haversine distance + metro helpers
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
  { id: 'dum-dum', name: 'Dum Dum', lat: 22.6219, lon: 88.3947, line: 'Line 1' },
  { id: 'belgachia', name: 'Belgachia', lat: 22.6062, lon: 88.3837, line: 'Line 1' },
  { id: 'shyambazar', name: 'Shyambazar', lat: 22.6005, lon: 88.3715, line: 'Line 1' },
  { id: 'sovabazar', name: 'Sovabazar Sutanuti', lat: 22.5961, lon: 88.3636, line: 'Line 1' },
  { id: 'girish-park', name: 'Girish Park', lat: 22.5863, lon: 88.3594, line: 'Line 1' },
  { id: 'm-g-road', name: 'Mahatma Gandhi Road', lat: 22.5793, lon: 88.3595, line: 'Line 1' },
  { id: 'central', name: 'Central', lat: 22.5732, lon: 88.3591, line: 'Line 1' },
  { id: 'chandni-chowk', name: 'Chandni Chowk', lat: 22.5656, lon: 88.3569, line: 'Line 1' },
  { id: 'esplanade', name: 'Esplanade', lat: 22.5628, lon: 88.3526, line: 'Line 1' },
  { id: 'park-street', name: 'Park Street', lat: 22.5555, lon: 88.3523, line: 'Line 1' },
  { id: 'rabindra-sadan', name: 'Rabindra Sadan', lat: 22.5367, lon: 88.3452, line: 'Line 1' },
  { id: 'netaji-bhavan', name: 'Netaji Bhavan', lat: 22.5291, lon: 88.3451, line: 'Line 1' },
  { id: 'jatin-das-park', name: 'Jatin Das Park', lat: 22.5208, lon: 88.3429, line: 'Line 1' },
  { id: 'kalighat', name: 'Kalighat', lat: 22.5196, lon: 88.3427, line: 'Line 1' },
  { id: 'rabindra-sarobar', name: 'Rabindra Sarobar', lat: 22.5074, lon: 88.3456, line: 'Line 1' },
  { id: 'mahanayak-uttam', name: 'Mahanayak Uttam Kumar', lat: 22.495, lon: 88.3453, line: 'Line 1' },
  { id: 'kavi-nazrul', name: 'Kavi Nazrul', lat: 22.4831, lon: 88.38, line: 'Line 1' },
  { id: 'salt-lake-sector-v', name: 'Salt Lake Sector V', lat: 22.579, lon: 88.428, line: 'Line 2' },
  { id: 'karunamoyee', name: 'Karunamoyee', lat: 22.582, lon: 88.414, line: 'Line 2' },
  { id: 'central-park', name: 'Central Park', lat: 22.586, lon: 88.405, line: 'Line 2' },
]

export function metrosWithinKm(pandal: { latitude: number; longitude: number }, radiusKm = 1): Metro[] {
  return KOLKATA_METROS.filter((m) => haversineKm({ lat: pandal.latitude, lon: pandal.longitude }, { lat: m.lat, lon: m.lon }) <= radiusKm)
}

export function topSharedMetros(pandals: { latitude: number; longitude: number }[], max = 3): Metro[] {
  const scored = KOLKATA_METROS.map((m) => ({
    metro: m,
    count: pandals.filter((p) => haversineKm({ lat: p.latitude, lon: p.longitude }, { lat: m.lat, lon: m.lon }) <= 1).length,
  }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, max)
    .map((s) => s.metro)
  return scored
}
