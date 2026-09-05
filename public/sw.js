// Agomon - minimal PWA service worker
// Needed for Chrome installability (fetch handler) + instant cache. No scary prompts.

const CACHE = "agomon-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // clean old caches
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  // Network-first for navigation, cache fallback for assets
  const req = event.request;
  if (req.method !== "GET") return;

  // Only handle same-origin
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // For pages, go network first
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          return res;
        } catch {
          const cached = await caches.match(req);
          return cached || caches.match("/");
        }
      })()
    );
    return;
  }

  // For assets, cache-first light
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        // cache static assets only
        if (res.ok && (url.pathname.match(/\.(png|jpg|jpeg|svg|webp|woff2|js|css)$/))) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone));
        }
        return res;
      } catch {
        return cached || Response.error();
      }
    })()
  );
});
