# Agomon — আগমন | Explore Various Pandals in Kolkata 2026

**Your Durga Pujo superpower.** Discover 110+ pandals on a live map, hop smarter, and never miss the magic.

**Live:** **https://agomon.vercel.app** — open on phone or desktop

![Agomon Logo](public/agomon-logo.png)

---

## Why Agomon?

Kolkata has 45+ legendary pujas in South alone — plus North, Dumdum, Behala, Central, Salt Lake. Agomon puts them all in your palm: searchable, sortable, routable, and crowd-aware. Built for pandal-hoppers, families, photographers, and first-timers.

---

## Features — What You Can Do

### 🪔 Hero & Discovery
- Gorgeous welcome hero with Durga eyes, Dhak, and Diya flicker — built for *Shubho Sharodiya*.
- Tap **Browse Pandals 🪔** to dive in. **Not logged in?** A glass pill **Login / Sign Up** appears right below — one tap to start saving.
- Gallery highlights and blog stories for the festive mood.

### 🗺️ Browse — Explore Various Pandals
- **Filter by area:** All, Nearby me (3 km via GPS), North Kolkata, Dumdum, South Kolkata, West Kolkata & Behala, Central Kolkata, Salt Lake & Rajarhat.
- **Smart Search:** Finds *Sreebhumi = Shreebhumi = Sribhumi*, stations, suburbs — powered by OSM. Try “Golpark, Chetla, Sealdah”.
- **Metro dropdown (2.2 km):** Tap the **arrow on the active pill (▾/▴)** to see nearest metros with live counts. Stays open so you can switch metros quickly — **blank taps never close it**. Smooth height push slides the pandal cards down with a soft blur.
- **Map:** Live MapLibre OSM, yellow diya pins, “M” metros, every card is tappable.

### 🛣️ Pujo Routing — Your Puja Hop, Optimized
- Pick **2–10 pandals** (optionally include your live location as the fixed start).
- Hit **Optimize** — we TSP-sort via road geometry and show distance, duration, and the route line on the map.
- **One-tap actions:** **Open in Google Maps** (full route + per-segment links) and **Save as Public or Private** to your account. Public routes appear in the community feed; Private stays yours.
- Beautiful feed with distance, duration, and Admin Suggested / AI badges.

### 🚌 Travel Plan — Bus + Metro, Without the Chaos
- **Free-text from → to:** Type a pandal, mall, or station (“Shyambazar → South City Mall”) — we resolve it to the nearest real bus stop.
- **1919 routes, 2233 stops** — Direct, 1-change, and 2-change plans ranked by **Time** (metro boosted when crowd is high) or **Budget** (stage fare + metro slabs).
- **Up to 3 verified plans** per search: boarding stop, destination stop, intermediate stops, bus code / metro, fare (₹), time (min), and Google Transit link. **Never fake** — if no bus exists, we clearly say so.
- **Use my location:** Jumps to the closest stop; “Nearby Bus Stop in Google Maps” at zoom 17.

### 🔥 Crowd Forecast — Know Before You Go
- **48 × 30-min slots** from 00:00 to 23:30, coloured 5–98%.
- **Peak 5–8 PM, lunch dip 12–2 PM** — we model cluster (pandals within 2 km), landmarks (South City, Acropolis, Quest…), metro proximity, and rating.
- See **Current / Best / Worst** window + trend (rising / falling) right under the meter, above Top 5 landmarks.

### ⭐ Community & Details
- Each pandal page shows **nearest metros**, **landmarks within 2.2 km**, **address**, **ratings**, and **community reviews** (one per user). Write yours after logging in.
- **Top 5** malls/markets near the pandal for food & shopping.

### 🔐 Accounts — Email + Google, Your Way
- **Continue with Google** (white button, 4-color G) or **Gmail + password** (email verification link, check Spam too). Both stay independent — log in either way.
- **My Account** (`/account`, protected): Large avatar with ✎ editor (up to 5 MB, square), editable unique username, email, and **member since**. Avatar appears **beside the hamburger** on every page (phone + desktop) and links to `/account`.
- **Security, solved:**
  - *Email user:* **Change Password** (new + confirm) and **Send reset link** to your Gmail.
  - *Email user:* **Link Google Account** — one click while logged in (requires *Allowed Manual Linking*).
  - *Google user:* **Set Password** to enable Email login for your Gmail, and **Link Email** — enter an existing email + its password to verify ownership; we send a confirmation link. Forgot? Reset first, then link.
- **Header drawer** (`1/3 width slide`): Top profile card (avatar, name, email, **Google • Gmail / Email • Verified** pill) + **My Account** + **Logout** + “Tap avatar to edit”.

### 🤖 Vani — Your Pujo Chatbot
- Bottom-right on **every page, phone + desktop + Android app**. Powered by Botpress Cloud.
- Ask in plain words: *“Make a route in South Kolkata for 5 pandals”* — Vani picks random pandals in that area, optimizes the route, and returns the **ordered list + Agomon link + Google Maps link + Save Public/Private buttons**.
- Ask *“How to go from Dum Dum to Santoshpur?”* — Vani summarizes **bus + metro** with collapsed legs (tap to expand, never crowded).
- **No blinking cursor** on close — caret is hidden on the bubble shell, kept inside inputs. Positioned at `16px` (desktop) / `safe-area-inset` (mobile) above the footer.

### ✨ Look & Feel — Untitled Blend + Glass
- **Fixed backdrop:** Midnight Lapis `#08154D`, Black Current `#071F46`, Dusk Pine `#796B28`, Ink Blue `#05134F` — `135deg in oklab` static gradient, soft radial glows. No wave — calm and readable.
- **Liquid glass:** More open cards (`blur 18–22px`, softer borders) let the backdrop breathe while keeping yellow `#FFD60A` on navy `#020617` — your festival night.

### 🔌 For Builders — Botpress APIs
- Secure server-side endpoints at `https://agomon.vercel.app/api/*` (`GET /health`, `POST /pujo-routing`, `POST /travel-plan`, `POST /crowd-forecast`) — `Authorization: Bearer BOTPRESS_API_KEY` (never hard-coded), CORS allowlisted, rate-limited, consistent `{success, data/error}` envelope. See `docs/API.md` for curl examples.

---

## What's New — Kolkata 2026

- **Google + Email auth** with linked accounts, profile pics in header, and a dedicated **My Account** hub.
- **Hero Login pill** — no more hunting for login; it finds you when you need it.
- **Browse, reborn** — arrow-only metro dropdown, stays open, fluid card push, blur-slide animations.
- **Vani everywhere** — Botpress chatbot on web + WebView app, caret-fixed, safe-area aware.
- **Untitled backdrop** — calm Lapis/Pine gradient behind lighter glass — your pandals pop.
- **Public API** for Vani to call routing, travel, and crowd engines securely.

---

## License — MIT (Open, Commercial-Friendly)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**Copyright (c) 2026 Agomon (SOUL Productions)**

**You are free to — for any purpose, including commercial:**

- Use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of this software.
- Permit others to do the same, as long as you keep the original **LICENSE** and copyright notice in all copies or substantial portions.

This covers all code, styles, and documentation in this repository. Third-party open data remains with its authors (see below).

**The software is provided “as is”, without warranty of any kind.** No liability for the authors — see [`LICENSE`](./LICENSE) for the full MIT text.

**Open data with credit:**

- **Kolkata Travel Router** by [Akash190104](https://github.com/Akash190104/kolkata-travel-router) — bus graph & metro connections.
- **OpenStreetMap** © contributors (ODbL) — Nominatim / Overpass `railway=station` geocoding.
- **OSRM** by Project OSRM — trip/route optimization (public demo server).

Keep the notice, share the joy — **Dugga Dugga, Cholo Pujo!**

