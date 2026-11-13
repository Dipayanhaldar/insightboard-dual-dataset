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
    try {
      const shellResponse = await fetch(APP_SHELL_URL, { cache: 'reload' });
      if (shellResponse.ok) {
        await cache.put(APP_SHELL_URL, shellResponse.clone());
      }
    } catch {}
    try {
      await cache.addAll(PRECACHE_URLS);
    } catch {}

    // Pre-cache production JS/CSS bundles if manifest is available
    try {
      const manifestResponse = await fetch(ASSET_MANIFEST_URL, { cache: 'no-store' });
      if (manifestResponse.ok) {
        const assetManifest = await manifestResponse.json();
        const assets = [...new Set(Object.values(assetManifest).flatMap(entry => [
          entry.file,
          ...(entry.css || [])
        ]).filter(file => typeof file === 'string' && /\.(?:js|css)$/.test(file))
          .map(file => file.startsWith('/') ? file : '/' + file))];
        if (assets.length) await cache.addAll(assets);
      }
    } catch {}
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

// Network-First strategy for HTML, JS, CSS, and navigation so updates pushed to GitHub/Vercel
// propagate immediately to Website, Android APK (TWA/WebView), and Windows Store (MSIX) wrappers.
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Never cache authentication, database, account or other API responses.
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request, { cache: 'no-store' });
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

  // Network-First for core JS, CSS, and static assets with instant offline fallback
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    /\.(?:js|css|json|webmanifest|webp|png|svg|mp3)$/i.test(url.pathname)
  ) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        const cached = await caches.match(request);
        return cached || Response.error();
      }
    })());
  }
});
