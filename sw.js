/* Rippl service worker (web install only). App files: network first, cache when offline.
   The two CDN libraries are cached too, so the web app can start without internet after the first visit. */
const CACHE = "rippl-shell-v3";
const SHELL = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "icons/logo-mark.png",
  "js/manifest.js",
  "js/loader.js",
  "css/base.css",
  "css/components/avatars.css",
  "css/layout/screens.css",
  "css/pages/notifications/notifications.css",
  "css/pages/inbox/search-rows.css",
  "css/pages/profile/profile.css",
  "css/pages/inbox/new-message.css",
  "css/pages/profile/profile-header.css",
  "css/pages/profile/user-profile.css",
  "css/pages/inbox/inbox.css",
  "css/pages/inbox/new-group.css",
  "css/features/status-sheet.css",
  "css/pages/profile/profile-details.css",
  "css/pages/home/feed.css",
  "css/pages/home/posts-composer.css",
  "css/pages/chat/chat.css",
  "css/pages/servers/servers.css",
  "css/pages/gate/auth-gate.css",
  "css/features/net-banner.css",
  "css/features/notif-badge.css",
  "css/features/new-posts-pill.css",
  "components/home.html",
  "components/server.html",
  "components/new-message.html",
  "components/new-group.html",
  "components/notifications.html",
  "components/compose.html",
  "components/profile.html",
  "components/chat.html",
  "components/user-profile.html",
  "components/edit-profile.html",
  "components/me-bar.html",
  "components/status-sheet.html",
  "components/auth-gate.html",
  "js/core/app-core.js",
  "js/pages/users/user-profile.js",
  "js/pages/inbox/new-group.js",
  "js/features/status-sheet.js",
  "js/pages/inbox/inbox.js",
  "js/pages/notifications/notifications.js",
  "js/pages/home/feed.js",
  "js/pages/profile/my-profile.js",
  "js/features/post-actions.js",
  "js/pages/home/composer.js",
  "js/core/tabs.js",
  "js/pages/chat/chat.js",
  "js/pages/servers/servers.js",
  "js/core/auth-gate-preshow.js",
  "js/features/auth.js",
  "js/pages/profile/edit-profile.js",
  "js/features/offline-db.js",
  "js/features/chats-sync.js",
  "js/features/feed-sync.js",
  "js/features/social-sync.js",
  "js/features/notifications-sync.js",
  "js/features/live-presence.js",
  "js/core/native-shell.js"
];
const LIBS = ["https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", "https://unpkg.com/lucide@0.453.0/dist/umd/lucide.min.js"];
self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => Promise.all([...LIBS.map(u => c.add(new Request(u, { mode: "no-cors" })).catch(() => {})), ...SHELL.map(u => c.add(u).catch(() => {}))]))); });
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET") return;
  if (LIBS.includes(r.url)) { e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); return res; }))); return; }
  if (new URL(r.url).origin !== location.origin) return; // never touch Supabase or other requests
  e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); return res; })
    .catch(() => caches.match(r).then(m => m || (r.mode === "navigate" ? caches.match("index.html") : Response.error()))));
});
