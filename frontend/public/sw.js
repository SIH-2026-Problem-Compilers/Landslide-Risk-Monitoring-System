/* NER Landslide Early Warning – service worker
 *
 * Precaches the app shell (index.html + static assets) so the dashboard
 * loads offline.  API responses (predictions, alerts, grid) are NOT cached
 * by the SW – the frontend handles stale-while-revalidate via React Query.
 *
 * IndexedDB is used for the offline citizen-report queue
 * (see src/utils/offlineQueue.ts).
 */

const CACHE_NAME = 'ner-lew-v1';
const PRECACHE_URLS = [
  '/',
  '/index.html',
];

// Install: precache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET
  if (event.request.method !== 'GET') return;

  // API calls: network only (never cache)
  if (url.pathname.startsWith('/api/')) return;

  // Everything else: try network, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache a copy of successful same-origin navigations/assets
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
