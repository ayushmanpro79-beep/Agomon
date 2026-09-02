// src/lib/trainStations.ts:1 - Kolkata local + metro stations — OSM railway=station|halt verified (Nominatim class=railway type=station)
// Shahid Khudiram → Noapara + Sealdah/Howrah/Jadavpur etc. via scripts/geocode-stations.mjs
export type Station = { name: string; lat: number; lon: number; type: 'metro' | 'local' }

export const STATIONS: Station[] = [
  // Metro Line 1 South → North + Extension — railway=station verified
  { name: 'Kavi Subhash', lat: 22.4720556, lon: 88.3979434, type: 'metro' },
  { name: 'Shahid Khudiram', lat: 22.4659847, lon: 88.3915408, type: 'metro' },
  { name: 'Kavi Nazrul', lat: 22.4642505, lon: 88.3804604, type: 'metro' },
  { name: 'Gitanjali', lat: 22.4694673, lon: 88.3700115, type: 'metro' },
  { name: 'Masterda Surya Sen', lat: 22.4735865, lon: 88.3606732, type: 'metro' },
  { name: 'Netaji', lat: 22.4809928, lon: 88.3460002, type: 'metro' },
  { name: 'Mahanayak Uttam Kumar', lat: 22.4947692, lon: 88.3450879, type: 'metro' },
  { name: 'Rabindra Sarobar', lat: 22.5072216, lon: 88.3454936, type: 'metro' },
  { name: 'Kalighat', lat: 22.5168752, lon: 88.3458448, type: 'metro' },
  { name: 'Jatin Das Park', lat: 22.5241535, lon: 88.3464729, type: 'metro' },
  { name: 'Netaji Bhavan', lat: 22.5331821, lon: 88.3459269, type: 'metro' },
  { name: 'Rabindra Sadan', lat: 22.5414899, lon: 88.3473493, type: 'metro' },
  { name: 'Maidan', lat: 22.5494672, lon: 88.3487883, type: 'metro' },
  { name: 'Park Street', lat: 22.5551591, lon: 88.3501171, type: 'metro' },
  { name: 'Esplanade', lat: 22.5641292, lon: 88.3502752, type: 'metro' },
  { name: 'Chandni Chowk', lat: 22.5670118, lon: 88.3541581, type: 'metro' },
  { name: 'Central', lat: 22.5724857, lon: 88.3587427, type: 'metro' },
  { name: 'Mahatma Gandhi Road', lat: 22.5809206, lon: 88.3613271, type: 'metro' },
  { name: 'Girish Park', lat: 22.5871445, lon: 88.3629415, type: 'metro' },
  { name: 'Sovabazar Sutanuti', lat: 22.595881, lon: 88.3651996, type: 'metro' },
  { name: 'Shyambazar', lat: 22.601335, lon: 88.3724974, type: 'metro' },
  { name: 'Belgachia', lat: 22.6059241, lon: 88.3863913, type: 'metro' },
  { name: 'Dum Dum', lat: 22.6211141, lon: 88.3928973, type: 'metro' },
  { name: 'Noapara', lat: 22.6398418, lon: 88.3941343, type: 'metro' },
  { name: 'Baranagar', lat: 22.6530765, lon: 88.3805962, type: 'metro' },
  { name: 'Dakshineswar', lat: 22.653, lon: 88.365, type: 'metro' }, // fallback — no railway=station result, kept approximate
  { name: 'Salt Lake Sector V', lat: 22.579, lon: 88.428, type: 'metro' },
  // Aliases for search (keep Sovabazar variants)
  { name: 'Sovabazar', lat: 22.595881, lon: 88.3651996, type: 'metro' },
  { name: 'Shobhabazar', lat: 22.595881, lon: 88.3651996, type: 'metro' },
  { name: 'MG Road', lat: 22.5809206, lon: 88.3613271, type: 'metro' },
  // Local train — railway=station|halt verified
  { name: 'Sealdah', lat: 22.5673793, lon: 88.3710192, type: 'local' },
  { name: 'Howrah', lat: 22.5833648, lon: 88.3403452, type: 'local' },
  { name: 'Dum Dum Junction', lat: 22.6206549, lon: 88.3932794, type: 'local' },
  { name: 'Tollygunge', lat: 22.5077549, lon: 88.3477217, type: 'local' },
  { name: 'Jadavpur', lat: 22.4950517, lon: 88.374971, type: 'local' },
  { name: 'Ballygunge', lat: 22.5193414, lon: 88.3719778, type: 'local' },
  { name: 'Park Circus', lat: 22.5407799, lon: 88.3738814, type: 'local' },
  { name: 'Bidhannagar Road', lat: 22.5912601, lon: 88.3909641, type: 'local' },
  { name: 'Garia', lat: 22.4726577, lon: 88.3977506, type: 'local' },
  { name: 'New Garia', lat: 22.4726577, lon: 88.3977506, type: 'local' },
  { name: 'Baghajatin', lat: 22.4827391, lon: 88.3866708, type: 'local' },
  { name: 'Sonarpur', lat: 22.443192, lon: 88.4303414, type: 'local' },
  { name: 'Barasat', lat: 22.7241917, lon: 88.4834422, type: 'local' },
]
