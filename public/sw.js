const CACHE_NAME = 'insightboard-shell-v4';
const OFFLINE_URL = '/offline.html';
const APP_SHELL_URL = '/';
const ASSET_MANIFEST_URL = '/asset-manifest.json';
const PRECACHE_URLS = [
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/icons/insightboard.svg',
  '/icons/insightboard-192.png',
  '/icons/insightboard-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const shellResponse = await fetch(APP_SHELL_URL, { cache: 'reload' });
    if (!shellResponse.ok) throw new Error('Unable to fetch the InsightBoard app shell');
    await cache.put(APP_SHELL_URL, shellResponse.clone());
    await cache.addAll(PRECACHE_URLS);

    // Pre-cache all production JS/CSS bundles, including lazy chunks.
    const manifestResponse = await fetch(ASSET_MANIFEST_URL, { cache: 'no-store' });
    if (!manifestResponse.ok) throw new Error('Unable to fetch the production asset manifest');
    const assetManifest = await manifestResponse.json();
    const assets = [...new Set(Object.values(assetManifest).flatMap(entry => [
      entry.file,
      ...(entry.css || [])
    ]).filter(file => typeof file === 'string' && /\.(?:js|css)$/.test(file))
      .map(file => file.startsWith('/') ? file : '/' + file))];
    if (assets.length) await cache.addAll(assets);
    await self.skipWaiting();
  })());
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
