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

### 3. Travel Plan — Bus + Train Router
- Route `src/app/travel-plan/page.tsx:1` (no framed map) — port of `Akash190104/kolkata-travel-router` (`data/busdata.json` 1919 routes, 2233 stops + `Kolkata_Metro_Bus_Connections.txt`) via `src/lib/travelRouter.ts:6` `findRoutes()` (direct/one-change/two-change, `directional`, `scopeCost`)
- Inputs accept **pandal/suburb/area/station/landmark/mall anywhere** — `resolveToStop()` maps pandal lat/lon to nearest `HUB` bus stop via `haversineKm`; bus timings parsed from `raw_busrepo_routes*.js` (`firstBus/lastBus` where not `Coming Soon`)
- **Time vs Budget toggle** — both cards show `⏱ time + ₹ fare`; Time sorts by `timeMin` (metro boosted if `predictCrowd>=68`), Budget sorts by `fare` (`data/busRates.json` stage `0-4km 7…>24 +1/4km` + `data/metroRates.json` `1-2 stn 5…21+ 30`)
- **Nearest bus depot:** `📍 Use my location` + `🚌 Nearby Bus Stop in Google Maps` → `https://www.google.com/maps/search/bus+stop/@<lat>,<lng>,17z`
- Credit on page: **Bus graph by [Akash190104/kolkata-travel-router](https://github.com/Akash190104/kolkata-travel-router)** (name + link, no pic)

### 4. Top Places & Community
- `src/components/pandal/LandmarkList.tsx:23` — Top 5 malls/markets near pandal (2.2km)
- `ReviewSection.tsx:27` — Supabase `profiles` + `reviews` with `AggregateRating`

### 5. SEO (Vercel)
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



## License — © Agomon / SOUL Productions

**Proprietary — All Rights Reserved.**

This repository and its content, design, crowd model (`src/lib/crowd.ts`), map logic and branding (`public/agomon-logo.png`) are the exclusive property of **Agomon (SOUL Productions)**. No part may be copied, reproduced, distributed or used for commercial purposes without prior written permission from the owner.

Third-party open data used with credit:
- **Kolkata Travel Router** by [Akash190104](https://github.com/Akash190104/kolkata-travel-router) — bus graph & metro connections (used in `src/lib/travelRouter.ts` and `src/app/travel-plan/`, credited on page).
- OpenStreetMap © contributors (ODbL) — Nominatim/Overpass `railway=station` geocoding.

For licensing inquiries contact Agomon.

## Learn More

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [MapLibre GL](https://maplibre.org/)
