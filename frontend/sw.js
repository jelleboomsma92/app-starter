// [APP_NAME] service worker. Bump CACHE_NAME together with VERSION in index.html.
const CACHE_NAME = 'my-app-v0.1';
const SHELL = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache only good same-origin responses, never redirects such as the Access login
const cacheable = (response) => response.ok && response.type === 'basic' && !response.redirected;

// Pages come from the network first, so a new version and the Cloudflare Access login page always
// get through; the cached shell is only the offline fallback.
const handleNavigation = (e) => {
  e.respondWith(
    fetch(e.request).then((response) => {
      if (cacheable(response)) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put('/', clone));
      }
      return response;
    }).catch(() => caches.match('/').then((cached) => cached || caches.match('/index.html')))
  );
};

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;   // always live data, never from the cache
  if (e.request.mode === 'navigate') { handleNavigation(e); return; }

  // Other assets (icons, manifest): cache-first
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request).then((response) => {
      if (cacheable(response)) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
      }
      return response;
    }))
  );
});
