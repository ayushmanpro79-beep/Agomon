// scripts/geocode-stations.mjs — OSM railway=station|halt geocoder for Kolkata metro + local stations
// Shahid Khudiram → Noapara + Sealdah/Howrah/Jadavpur etc. via railway tag
// Run: node scripts/geocode-stations.mjs

import fs from 'fs'

const STATIONS_TO_GEOCODE = [
  // North-South corridor south to north (PDF) — full list Shahid Khudiram → Noapara
  { id: 'kavi-subhash', name: 'Kavi Subhash', aliases: ['Kavi Subhas', 'New Garia'], type: 'metro' },
  { id: 'shahid-khudiram', name: 'Shahid Khudiram', aliases: ['Briji'], type: 'metro' },
  { id: 'kavi-nazrul', name: 'Kavi Nazrul', aliases: ['Garia Bazar'], type: 'metro' },
  { id: 'gitanjali', name: 'Gitanjali', aliases: ['Naktala'], type: 'metro' },
  { id: 'masterda-surya-sen', name: 'Masterda Surya Sen', aliases: ['Bansdroni'], type: 'metro' },
  { id: 'netaji', name: 'Netaji', aliases: ['Kudghat'], type: 'metro' },
  { id: 'mahanayak-uttam', name: 'Mahanayak Uttam Kumar', aliases: ['Tollygunge'], type: 'metro' },
  { id: 'rabindra-sarobar', name: 'Rabindra Sarobar', aliases: [], type: 'metro' },
  { id: 'kalighat', name: 'Kalighat', aliases: [], type: 'metro' },
  { id: 'jatin-das-park', name: 'Jatin Das Park', aliases: [], type: 'metro' },
  { id: 'netaji-bhavan', name: 'Netaji Bhavan', aliases: ['Bhowanipore'], type: 'metro' },
  { id: 'rabindra-sadan', name: 'Rabindra Sadan', aliases: [], type: 'metro' },
  { id: 'maidan', name: 'Maidan', aliases: ['Gostho Pal'], type: 'metro' },
  { id: 'park-street', name: 'Park Street', aliases: [], type: 'metro' },
  { id: 'esplanade', name: 'Esplanade', aliases: [], type: 'metro' },
  { id: 'chandni-chowk', name: 'Chandni Chowk', aliases: [], type: 'metro' },
  { id: 'central', name: 'Central', aliases: [], type: 'metro' },
  { id: 'm-g-road', name: 'Mahatma Gandhi Road', aliases: ['M G Road', 'MG Road'], type: 'metro' },
  { id: 'girish-park', name: 'Girish Park', aliases: [], type: 'metro' },
  { id: 'sovabazar', name: 'Sovabazar Sutanuti', aliases: ['Shobhabazar', 'Sovabazar', 'Shobhabazar Sutanuti', 'Shyambazar'], type: 'metro' }, // handle closely spaced
  { id: 'shyambazar', name: 'Shyambazar', aliases: [], type: 'metro' },
  { id: 'belgachia', name: 'Belgachia', aliases: ['Belgachhia'], type: 'metro' },
  { id: 'dum-dum', name: 'Dum Dum', aliases: ['Dum Dum Metro'], type: 'metro' },
  // Extension Dum Dum → Dakshineswar → Noapara
  { id: 'noapara', name: 'Noapara', aliases: ['Ma Sarada Devi', 'Noapara Metro'], type: 'metro' },
  { id: 'baranagar', name: 'Baranagar', aliases: ['Swami Vivekananda', 'Baranagar Metro'], type: 'metro' },
  { id: 'dakshineswar', name: 'Dakshineswar', aliases: [], type: 'metro' },
  // Local railway stations (railway=station|halt)
  { id: 'sealdah', name: 'Sealdah', aliases: ['Sealdah Railway Station'], type: 'local' },
  { id: 'howrah', name: 'Howrah', aliases: ['Howrah Junction', 'Howrah Railway Station'], type: 'local' },
  { id: 'jadavpur', name: 'Jadavpur', aliases: [], type: 'local' },
  { id: 'dum-dum-jn', name: 'Dum Dum Junction', aliases: ['Dum Dum Jn', 'Dum Dum'], type: 'local' },
  { id: 'tollygunge', name: 'Tollygunge', aliases: [], type: 'local' },
  { id: 'ballygunge', name: 'Ballygunge', aliases: ['Ballygunge Junction'], type: 'local' },
  { id: 'park-circus', name: 'Park Circus', aliases: [], type: 'local' },
  { id: 'bidhannagar-road', name: 'Bidhannagar Road', aliases: ['Bidhannagar'], type: 'local' },
  { id: 'garia', name: 'Garia', aliases: [], type: 'local' },
  { id: 'sonarpur', name: 'Sonarpur', aliases: ['Sonarpur Junction'], type: 'local' },
  { id: 'barasat', name: 'Barasat', aliases: ['Barasat Junction'], type: 'local' },
  { id: 'new-garia', name: 'New Garia', aliases: [], type: 'local' },
  { id: 'baghajatin', name: 'Baghajatin', aliases: [], type: 'local' },
  { id: 'golpark', name: 'Golpark', aliases: [], type: 'local' },
]

// Overpass query for railway=station|halt with name ~ exact (case-insensitive) around Kolkata 22.5726,88.3639 radius 30km
async function queryOverpass(name) {
  const centerLat = 22.5726, centerLon = 88.3639, radius = 30000
  // Escape for regex
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const query = `[out:json][timeout:25];
(
  node["railway"~"^(station|halt)$"]["name"~"^${esc}$",i](around:${radius},${centerLat},${centerLon});
  node["railway"~"^(station|halt)$"]["name:en"~"^${esc}$",i](around:${radius},${centerLat},${centerLon});
  way["railway"~"^(station|halt)$"]["name"~"^${esc}$",i](around:${radius},${centerLat},${centerLon});
  way["railway"~"^(station|halt)$"]["name:en"~"^${esc}$",i](around:${radius},${centerLat},${centerLon});
  relation["railway"~"^(station|halt)$"]["name"~"^${esc}$",i](around:${radius},${centerLat},${centerLon});
  relation["railway"~"^(station|halt)$"]["name:en"~"^${esc}$",i](around:${radius},${centerLat},${centerLon});
);
out center 1;`
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Agomon/1.0 (agomon.kolkata@gmail.com)' } })
    if (!res.ok) throw new Error(`Overpass ${res.status}`)
    const json = await res.json()
    if (json.elements && json.elements.length) {
      // Prefer node, then way, sort by having railway=station tag
      const el = json.elements.find(e => e.tags?.railway === 'station') || json.elements[0]
      const lat = el.lat ?? el.center?.lat
      const lon = el.lon ?? el.center?.lon
      if (lat && lon) return { lat, lon, tags: el.tags, osm_id: el.id, osm_type: el.type, source: 'overpass-railway' }
    }
  } catch (e) {
    console.log(`  overpass error for ${name}: ${e.message}`)
  }
  return null
}

// Fallback: Nominatim with railway class filter, viewbox bounded to Kolkata
async function queryNominatimRailway(name) {
  const viewbox = '88.18,22.80,88.55,22.40'
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name + ' railway station, Kolkata, India')}&format=json&limit=5&addressdetails=1&viewbox=${viewbox}&bounded=0&countrycodes=in`
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Agomon/1.0 (agomon.kolkata@gmail.com)', 'Accept-Language': 'en' } })
    if (!res.ok) throw new Error(`Nominatim ${res.status}`)
    const data = await res.json()
    // Filter to railway=station|halt
    const filtered = data.filter(d => d.class === 'railway' && ['station','halt'].includes(d.type))
    const candidate = filtered[0] || null
    if (candidate) {
      return { lat: parseFloat(candidate.lat), lon: parseFloat(candidate.lon), display: candidate.display_name, source: 'nominatim-railway', cls: candidate.class, type: candidate.type }
    }
    // If no railway-class result, try without railway suffix but still require railway class
    if (!candidate && data.length) {
      // try pure name without railway suffix
      const url2 = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name + ', Kolkata, India')}&format=json&limit=5&addressdetails=1&viewbox=${viewbox}&bounded=0&countrycodes=in`
      const res2 = await fetch(url2, { headers: { 'User-Agent': 'Agomon/1.0 (agomon.kolkata@gmail.com)', 'Accept-Language': 'en' } })
      const data2 = await res2.json()
      await new Promise(r => setTimeout(r, 1100))
      const f2 = data2.filter(d => d.class === 'railway' && ['station','halt'].includes(d.type))
      if (f2[0]) return { lat: parseFloat(f2[0].lat), lon: parseFloat(f2[0].lon), display: f2[0].display_name, source: 'nominatim-railway-fallback', cls: f2[0].class, type: f2[0].type }
    }
  } catch (e) {
    console.log(`  nominatim error for ${name}: ${e.message}`)
  }
  return null
}

async function geocodeStation(station) {
  const namesToTry = [station.name, ...station.aliases]
  for (const n of namesToTry) {
    console.log(`  Trying nominatim-railway for "${n}"...`)
    const nm = await queryNominatimRailway(n)
    if (nm) { console.log(`    ✓ nominatim-railway ${nm.lat},${nm.lon}`); return nm }
    await new Promise(r => setTimeout(r, 1100))
    console.log(`  Trying overpass for "${n}"...`)
    const ov = await queryOverpass(n)
    if (ov) { console.log(`    ✓ overpass-railway ${ov.lat},${ov.lon} [${ov.tags?.name}]`); return ov }
    await new Promise(r => setTimeout(r, 800))
  }
  console.log(`  ✗ no railway=station|halt found for ${station.name}`)
  return null
}

async function main() {
  const results = []
  for (const st of STATIONS_TO_GEOCODE) {
    console.log(`\n[${st.type}] ${st.name} (${st.id})`)
    const res = await geocodeStation(st)
    results.push({ ...st, result: res, success: !!res })
    // throttle between stations
    await new Promise(r => setTimeout(r, 800))
  }

  console.log(`\n\n=== SUMMARY ===`)
  console.log(`Total: ${results.length}, Success: ${results.filter(r=>r.success).length}, Failed: ${results.filter(r=>!r.success).length}`)
  results.forEach(r => {
    if (r.success) console.log(`${r.id}: ${r.name} -> ${r.result.lat.toFixed(6)}, ${r.result.lon.toFixed(6)} (${r.result.source})`)
    else console.log(`${r.id}: ${r.name} -> FAILED`)
  })

  // Write patch files
  const outPath = './scripts/geocode-stations-result.json'
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2))
  console.log(`\nWritten ${outPath}`)

  // Also generate updated trainStations.ts snippet
  const metroResults = results.filter(r => r.type === 'metro' && r.success)
  const localResults = results.filter(r => r.type === 'local' && r.success)
  console.log(`\nUpdated metro: ${metroResults.length}, local: ${localResults.length}`)
}

main()
