# Agomon API for Botpress

Base URL: `https://agomon.vercel.app` (or `http://localhost:3000` locally)

All endpoints require `Authorization: Bearer <BOTPRESS_API_KEY>` where `BOTPRESS_API_KEY` is server env `BOTPRESS_API_KEY` (never hard-coded, never `NEXT_PUBLIC`). CORS allowed origin configured via `BOTPRESS_ALLOWED_ORIGIN` (default `https://cdn.botpress.cloud,https://files.bpcontent.cloud,https://studio.botpress.cloud`).

Response envelope:
- Success: `{ "success": true, "data": { ... } }` (200)
- Error: `{ "success": false, "error": { "code": "...", "message": "..." } }`
  Codes: `BAD_REQUEST` (400), `UNAUTHORIZED` (401), `NOT_FOUND` (404), `NO_RESULT` (200 with success true + empty data or error code), `RATE_LIMITED` (429 with `Retry-After`), `INTERNAL` (500, never stack)

Rate limit: 60 req/min per IP + 200/min per key window, `Retry-After` header.

---

## GET /api/health

Auth: Bearer required

```bash
curl -X GET https://agomon.vercel.app/api/health \
 -H "Authorization: Bearer $BOTPRESS_API_KEY"
```

Success 200:
```json
{ "success": true, "service": "agomon-api" }
```
Error 401:
```json
{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "Missing Authorization: Bearer <token>" } }
```

CORS preflight:
```bash
curl -X OPTIONS https://agomon.vercel.app/api/health -H "Origin: https://cdn.botpress.cloud" -H "Access-Control-Request-Method: GET" -H "Access-Control-Request-Headers: Authorization"
# 204 with Allow-Origin
```

---

## POST /api/pujo-routing

Uses Agomon `getOptimizedRoute` (OSRM Trip source=first, roundtrip=false, 10s abort) + `fallbackNearestOrder` + haversine.

Auth: Bearer
Method: POST
URL: `/api/pujo-routing`

Request:
```json
{
  "metroStation": "Dum Dum",
  "metroLatitude": 22.6211141,
  "metroLongitude": 88.3928973,
  "stopCount": 4,
  "selectedPandalIds": ["uuid-1","uuid-2","uuid-3","uuid-4"],
  "crowdInformation": null
}
```
- `metroStation` string 1-100 required
- `metroLatitude` -90..90, `metroLongitude` -180..180
- `stopCount` int 2..10
- `selectedPandalIds` array 1..20 uuid, at least 1
- `crowdInformation` any optional (echoed back)

Response 200 success:
```json
{
  "success": true,
  "data": {
    "metro": { "station":"Dum Dum","latitude":22.62,"longitude":88.39 },
    "stopCount":4,
    "requestedStopCount":4,
    "selectedPandalIds":["..."],
    "verifiedPandals":[{"id":"...","name":"...","slug":"...","area":"North Kolkata","latitude":22.6,"longitude":88.36,"address":"..."}],
    "optimizedOrder":["uuid-2","uuid-1",...],
    "coordinates":[{"latitude":22.6,"longitude":88.36},...],
    "addresses":["...","..."],
    "distances":[1200, 800],
    "durations":[240,180],
    "segmentDetails":[{"from":"Dum Dum Park","to":"Shyambazar","distanceM":1200,"durationS":240},...],
    "totalDistanceM":5400,
    "totalDurationS":980,
    "routeGeometry":{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"LineString","coordinates":[[88.39,22.62],...]}}]},
    "fallback":false,
    "agomonUrl":"https://agomon.vercel.app/pujo-routing/create?pandals=slug1,slug2&metro=Dum%20Dum",
    "agomonPujaRoutingUrl":"https://agomon.vercel.app/pujo-routing/create?pandals=...",
    "googleMapsUrl":"https://www.google.com/maps/dir/?api=1&origin=22.62,88.39&destination=22.60,88.37&waypoints=22.6,88.36|...&travelmode=driving",
    "segmentUrls":["https://www.google.com/maps/dir/?api=1&origin=22.6,88.36&destination=22.61,88.37&travelmode=driving", "..."],
    "crowdInformation": null
  }
}
```
Errors: 400 `BAD_REQUEST` (zod), 401, 429, 500, 200 `NO_RESULT` if no verified pandals.

Example:
```bash
curl -X POST https://agomon.vercel.app/api/pujo-routing \
 -H "Authorization: Bearer $BOTPRESS_API_KEY" -H "Content-Type: application/json" \
 -d '{"metroStation":"Dum Dum","metroLatitude":22.6211,"metroLongitude":88.3928,"stopCount":3,"selectedPandalIds":["a8c82f5e-0344-4898-bba1-1786b3b5a575","0d69fa7d-1975-4c8b-8a0f-a070161c07ed","4dcb7822-ee73-4515-80dd-20d89c752adf"]}'
```

---

## POST /api/travel-plan

Uses `findRoutes` + `rankPlans` + `resolveToStop` (alias + haversine <5km → areaHub), 1919 routes.

Auth: Bearer
URL: `/api/travel-plan`

Request:
```json
{
  "startPandal":"Shyambazar",
  "destinationPandal":"South City Mall",
  "startPandalId":"uuid",
  "destinationPandalId":"uuid",
  "startCoordinates":{"latitude":22.60,"longitude":88.37},
  "destinationCoordinates":{"latitude":22.50,"longitude":88.346},
  "startAddress":"Shyambazar, Kolkata",
  "destinationAddress":"South City Mall",
  "crowdForecast": null
}
```
- `startPandal`, `destinationPandal` required 1-100
- Others optional

Response 200 (up to 3 plans, never fake):
```json
{
  "success": true,
  "data": {
    "startPandal":"Shyambazar","destinationPandal":"South City Mall",
    "startResolved":"Shyambazar","destResolved":"South City Mall",
    "plans":[
      {
        "rank":1,"travelMode":"mixed","mode":"mixed","route":"30B → Metro M1","transfers":1,
        "metroDetails":[{"route":"M1","from":"Esplanade","to":"Kalighat","towards":"Kavi Subhash","stops":[]}],
        "legs":[
          {"route":"30B","busCode":"30B","kind":"private","boardingStop":"Shyambazar","destinationStop":"Esplanade","from":"Shyambazar","to":"Esplanade","towards":"Esplanade","intermediateStops":[],"stops":["Shyambazar","..."],"boardingCoordinates":null,"destinationCoordinates":null,"distanceKm":6.8,"link":null}
        ],
        "boardingStop":"Shyambazar","destinationStop":"South City Mall",
        "intermediateStops":[],"distanceKm":12.2,"durationMin":28,"duration":28,"fare":18,"fareInr":18,"link":"https://www.google.com/maps/dir/?api=1&origin=...&destination=...&travelmode=transit","googleMapsUrl":"...","links":[]
      }
    ],
    "meta":{"totalFound":5,"returned":3,"direct":1,"one":2,"two":0}
  }
}
```
Empty: `{ "success": true, "data": { "plans": [], "meta": {"totalFound":0} } }` ; unknown stop → `plans:[]` with `meta.error:"NO_RESULT"`

```bash
curl -X POST https://agomon.vercel.app/api/travel-plan \
 -H "Authorization: Bearer $BOTPRESS_API_KEY" -H "Content-Type: application/json" \
 -d '{"startPandal":"Howrah Station","destinationPandal":"Dakshineswar","startCoordinates":{"latitude":22.5833,"longitude":88.3403}}'
```

---

## POST /api/crowd-forecast

Uses `predictCrowd` deterministic (TIME_SLOTS + cluster + landmark + urban + rating).

Auth: Bearer
URL: `/api/crowd-forecast`

Request:
```json
{
  "pandalId":"uuid",
  "area":"South Kolkata",
  "latitude":22.515,
  "longitude":88.391,
  "visitDate":"2026-10-20T18:00:00.000Z",
  "visitTime":"18:30",
  "location":{"latitude":22.5,"longitude":88.34}
}
```
At least one of `pandalId` / `area` / `latitude+longitude` / `location` required. `visitDate` ISO or `visitTime` HH:MM, else now.

Response:
```json
{
  "success": true,
  "data": {
    "pandalId":"uuid","pandalName":"Acropolis Mall area","area":"South Kolkata",
    "location":{"latitude":22.5,"longitude":88.34},
    "requestedVisit":{"visitDate":"2026-10-20T18:00:00.000Z","visitTime":"18:30","hour":18.5},
    "crowdPercentage":76,
    "crowdLevel":"Very High",
    "bestVisitingTime":"05:30",
    "bestCrowdPercentage":12,
    "timeSlot":{"label":"5-8 PM","desc":"Peak","factor":1.0},
    "details":{"clusterNearby":3,"clusterScore":75,"landmark":"Acropolis Mall","landmarkScore":68},
    "explanation":"Very High crowd expected at 18:30 (Peak). 3 pandals within 1km, nearest Acropolis Mall · cluster 75% · poi 68%. Best window 05:30 (12%).",
    "allSlots":[{"time":"00:00","score":18},...]
  }
}
```

```bash
curl -X POST https://agomon.vercel.app/api/crowd-forecast \
 -H "Authorization: Bearer $BOTPRESS_API_KEY" -H "Content-Type: application/json" \
 -d '{"pandalId":"a8c82f5e-0344-4898-bba1-1786b3b5a575","visitTime":"18:00"}'
```

---

## Environment Variables (Vercel → Settings → Environment Variables)

- `BOTPRESS_API_KEY` (server, required, generate `openssl rand -hex 32`)
- `BOTPRESS_ALLOWED_ORIGIN` (optional, default `https://cdn.botpress.cloud,https://files.bpcontent.cloud,https://studio.botpress.cloud,https://agomon.vercel.app`)
- `NEXT_PUBLIC_SITE_URL` (already `https://agomon.vercel.app`)
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (already)
- `OSRM_BASE` (optional, default `https://router.project-osrm.org`)

Never expose `SUPABASE_SERVICE_ROLE_KEY` — endpoints use `createPlainServerClient` (anon).

---

## Authentication

`Authorization: Bearer <BOTPRESS_API_KEY>`

Botpress HTTP Tool → Headers → Add `Authorization` → `Bearer {{env.BOTPRESS_API_KEY}}` or hardcode server key (store in Botpress Secrets, not in Agomon code).

---

## CORS

Allowed origin echoed from `BOTPRESS_ALLOWED_ORIGIN`. Preflight `OPTIONS` returns 204. Tested with `curl -X OPTIONS`.

---

## Rate Limiting & Errors

Never stack trace. `400` for zod, `401` for auth, `429` with `Retry-After`, `500` generic.

---

## Health

`GET /api/health` also requires Bearer per spec. Use for Botpress uptime check.

