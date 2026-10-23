/* Sheen service worker (web install only): network first, falls back to cache when offline. */
const CACHE = "sheen-shell-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET") return;
  if (new URL(r.url).origin !== location.origin) return; // never touch Supabase or CDN requests
  e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); return res; })
    .catch(() => caches.match(r).then(m => m || caches.match("index.html"))));
});
