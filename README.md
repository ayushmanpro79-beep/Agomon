# Agomon — আগমন | Explore Various Pandals in Kolkata 2026

Community platform for Kolkata Durga Puja — live map, crowd prediction and shortest bus + metro routing. Built for `https://agomon.vercel.app` (Vercel).

![Agomon Logo](public/agomon-logo.png)

## Features

### 1. Explore Various Pandals
- **Home** (`src/app/page.tsx:27`) — welcome + Durga eyes animation + blog
- **Browse** (`src/app/browse/page.tsx:7` + `BrowseClient.tsx:27`) — filter by 6 areas (`South Kolkata`, `North Kolkata` etc., `supabase/schema.sql:14`), search via `src/lib/searchEngine.ts:168` (OSM `railway=station|halt` 38/40 verified Shahid Khudiram→Noapara + `place=suburb` 3km fallback), metro dropdown within **2.2km** (`src/lib/geo.ts:49`)
- **Pandal Detail** (`src/app/pandal/[slug]/page.tsx:13` SSG + `PandalDetailClient.tsx:60`) — OSM MapLibre map (`src/components/map/PandalMap.tsx:31`), OSRM routing, `metrosWithinKm(2.2)` pins, `CrowdMeter` + `CrowdSummary`

### 2. Crowd Meter & Summary (No AI API)
- `src/lib/crowd.ts:120` `predictCrowd()` — 48×30min slots: `timeCurve` (Peak 5-8PM 1.0, Lunch dip 12-2PM 0.68) + `clusterScore` (nearby pandals ≤2km) + `landmarkScore` (malls `South City` etc. + `KOLKATA_METROS`) + `urbanDensity` + `ratingNorm`. No external AI.
- `src/components/pandal/CrowdMeter.tsx:31` — 48-bar gradient graph
- `src/components/pandal/CrowdSummary.tsx:14` — deterministic text `Current High 78% / Best 4:30 AM Low / Peak 7:30 PM` + trend, placed **beneath CrowdMeter, above Top 5** (`PandalDetailClient.tsx:102`)

### 3. Travel Plan — Bus + Metro Router
- Route `src/app/travel-plan/page.tsx:1` + `TravelPlanClient.tsx:12` (no framed map) — port of `Akash190104/kolkata-travel-router` (`data/busdata.json` 1919 routes, 2233 stops + `Kolkata_Metro_Bus_Connections.txt`) via `src/lib/travelRouter.ts:6` `findRoutes()` (direct/one-change/two-change, `directional`, `scopeCost`)
- Free-text resolution: `resolveToStop()` in `TravelPlanClient.tsx:69` maps pandal/suburb/area/station/landmark/mall input to the nearest `HUB` bus stop — exact stop match → `busdata.aliases` → pandal lat/lon to nearest geocoded stop via `haversineKm` (&lt;5km) → area hub fallback (`Tollygunge`/`Shyambazar`/`Esplanade`/`Dum Dum`/`Behala Chowrasta`/`Karunamoyee`) → `areaHints` table
- **Time vs Budget toggle** — both cards show `⏱ time + ₹ fare`; Time sorts by `timeMin` (metro boosted if `predictCrowd >= 68` from `src/lib/crowd.ts`), Budget sorts by `fare` (`data/busRates.json` stage `0-4km 7…>24 +1/4km` + `data/metroRates.json` `1-2 stn 5…21+ 30`); bus timings parsed from `raw_busrepo_routes*.js` (`firstBus`/`lastBus` where not `Coming Soon`)
- **Nearest bus depot:** `📍 Use my location` (geolocation → nearest stop resolution) + `🚌 Nearby Bus Stop in Google Maps` → `https://www.google.com/maps/search/bus+stop/@<lat>,<lng>,17z`
- Suggestion index unions pandal names + areas + `STATIONS` + `KOLKATA_METROS` + depot list + `availableStops()` (`TravelPlanClient.tsx:27`)
- Credit on page: **Bus graph by [Akash190104/kolkata-travel-router](https://github.com/Akash190104/kolkata-travel-router)** (name + link, no pic)

### 4. Pujo Routing — Multi-Pandal Optimizer + Community Feed
- Feed `src/app/pujo-routing/page.tsx:17` (ISR `revalidate = 60`) — public routes from Supabase `puja_routes` (`id,title,description,username,ordered_slugs,distance_m,duration_s,is_public`), empty-state CTA when none; detail `src/app/pujo-routing/[id]/page.tsx:1`, creator `src/app/pujo-routing/create/page.tsx:1`
- Creator `src/components/pujo-routing/PujoRouteCreator.tsx:12` — pick 2–10 pandals (area + text filter, max-60 list), optional live GPS start (`useLive`), `getOptimizedRoute()` from `src/lib/pujoRouting.ts` (OSRM Trip with `fallbackNearestOrder` on failure), result renders `PandalMap` route GeoJSON + distance/duration; save to `puja_routes` with `is_public` flag (graceful local-only mode when table/migration missing)
- Blends OSRM Trip routing (PUJO-APP by anujeetverma — MIT) with Agomon MapLibre overlay; floating `+` CTA for creation

### 5. Top Places & Community
- `src/components/pandal/LandmarkList.tsx:23` — Top 5 malls/markets near pandal (2.2km)
- `ReviewSection.tsx:27` — Supabase `profiles` + `reviews` with `AggregateRating`

### 6. SEO (Vercel)
- `src/app/layout.tsx:11` `metadataBase https://agomon.vercel.app`, `title.template`, `openGraph`, `twitter`, `robots`
- `src/app/sitemap.ts:6` dynamic ( `supabase pandals` → 50× `/pandal/[slug]` + `/` `/browse` `/travel-plan` `/about`), `src/app/robots.ts:4`, `next.config.ts:6` `301 /map→/browse`, `/about` `AboutPage` + `FAQPage` JSON-LD (`src/app/about/page.tsx:6`), 62 pages SSG

## Tech Stack / Dependencies

| Package | Version | Use |
|---|---|---|
| `next` | 16.3.3 | App Router, SSG `generateStaticParams`, `metadata` |
| `react` / `react-dom` | 19.2.8 | UI |
| `@supabase/supabase-js` | ^2.112.4 | `pandals`/`profiles`/`reviews` (`.env.local:1`) |
| `maplibre-gl` | ^6.6.0 | OSM tiles `tile.openstreetmap.org` + `PandalMap` |
| `fuse.js` | ^7.5.0 | Fuzzy `pandal` + `STATIONS` search |
| `animejs` | ^4.5.0 | `DurgaEyes` / `Deepak` animations |
| `tailwindcss` | ^4 | `globals.css` glass theme `#FFD60A`/`#020617` |
| `typescript` | ^5 | Types |
| `expo` / `react-native` | ^57 / 0.86 | Android wrapper (`app.json`) |
| `mapConfig` `VECTOR_STYLE`/`RASTER_STYLE` | — | `tile.openstreetmap.org` raster default |

**Data:** `data/busdata.json` (port of Bus Repository), `data/Kolkata_Metro_Bus_Connections.txt` (5 metro lines), `data/busRates.json` / `data/metroRates.json` (stage fare), `src/lib/geo.ts` OSM `railway=station|halt` 38/40 verified.

## Scripts

- `npm run dev` — Next dev (Turbopack root `next.config.ts:4`)
- `npm run build` — SSG + `sitemap.xml` / `robots.txt`
- `node scripts/geocode-stations.mjs` — OSM `railway=station|halt` re-geocode Shahid Khudiram→Noapara
- `python data/build.py` — rebuild `busdata.json` from `raw_busrepo_routes*.js` (optional)

## Deploy (Vercel — kept on Vercel)

```bash
vercel deploy --prod
# env in Vercel dashboard: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SITE_URL=https://agomon.vercel.app
```

## License — MIT

Copyright (c) 2026 Agomon (SOUL Productions)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

See [LICENSE](./LICENSE) for the full text.

Third-party open data used with credit:
- **Kolkata Travel Router** by [Akash190104](https://github.com/Akash190104/kolkata-travel-router) — bus graph & metro connections (used in `src/lib/travelRouter.ts` and `src/app/travel-plan/`, credited on page).
- OpenStreetMap © contributors (ODbL) — Nominatim/Overpass `railway=station` geocoding.

## Learn More

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [MapLibre GL](https://maplibre.org/)
