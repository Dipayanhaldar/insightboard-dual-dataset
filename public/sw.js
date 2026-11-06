const CACHE_NAME = 'insightboard-shell-v3';
const OFFLINE_URL = '/offline.html';
const APP_SHELL_URL = '/';
const PRECACHE_URLS = [
  APP_SHELL_URL,
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/icons/insightboard.svg',
  '/icons/insightboard-192.png',
  '/icons/insightboard-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Never cache authentication, database, account or other API responses.
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          // Keep a canonical app-shell copy for a fresh offline launch.
          await cache.put(APP_SHELL_URL, response.clone());
          if (url.pathname !== '/') await cache.put(request, response.clone());
        }
        return response;
      } catch {
        const cachedPage = await caches.match(request);
        return cachedPage || await caches.match(APP_SHELL_URL) || await caches.match(OFFLINE_URL);
      }
    })());
    return;
  }

  // Vite's hashed JS/CSS bundles and local media are cached after first use.
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        return cached || Response.error();
      }
    })());
  }
});
